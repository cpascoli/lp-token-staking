// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./StakingPool.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";


contract StakingRewardPool is StakingPool  {

    using SafeMath for uint256;

    struct RewardPhase {
        uint reward;
        uint from;
        uint to;
    }

    IERC20 internal rewardToken;
    RewardPhase[] public rewardPhases;

    event RewardInfo(uint stakerQuota, uint phaseInterval, uint rewardRate, uint reward);

    constructor(address _rewardTokenAddress, address _lpTokenAddress) StakingPool(_rewardTokenAddress, _lpTokenAddress) {
        rewardToken = IERC20(_rewardTokenAddress);
    }

    // Setup Reqards phase
    // - rewards work in phases. We will vote periodically for a new phase of the staking reward. For each phase we will decide the amount of token distributed per day, and the duration

    function newRewardPhase(uint reward, uint from, uint to) public onlyOwner {
        require(reward > 0, "Invalid reward amount");
        require(to > from, "Invalid reward interval");
        require(rewardPhases.length == 0 || from > rewardPhases[rewardPhases.length-1].to, "Invalid phase start time");

        rewardPhases.push(RewardPhase(reward, from, to));
        
        depositReward(reward);
    }

    function rewardBalance() public view returns (uint) {
        return rewardToken.balanceOf(address(this));
    }


    // Deposit ETB token reeards
    // - Since ETB has a fixed supply, the staking smart contract will have to be pre-funded with ETB tokens by the admin (Julien)
    function depositReward(uint amount) internal onlyOwner {
        // transferReward(msg.sender, address(this), amount);
        rewardToken.transferFrom(msg.sender, address(this), amount);
    }


    function endStake() public override {

        require(stakedBalances[msg.sender] > 0, "No tokens staked");
        
        // calculate reward
        (uint stakerQuota, uint phaseInterval, uint rewardRate, uint reward) = calculateRewards();
 
        super.endStake();

        emit RewardInfo(stakerQuota, phaseInterval, rewardRate, reward);

        // transfer reward to the useer
        rewardToken.transfer(msg.sender, reward);
    }


    // calculate rewards
    // - calculated proportionally to the time you spent in the pool, and your weight in the pool
   function calculateRewards() public view returns (uint, uint, uint, uint) {
        RewardPhase memory currentPhase = getCurrentRewardPhase();

        require(currentPhase.from > 0, appendUintToString("Invalid reward phase found. from: ", currentPhase.from) );

        uint from = currentPhase.from;
        uint to = Math.min(block.timestamp, currentPhase.to);

        require(from < to, "Invalid staking interval");

        uint precision = 10000;

        (uint stakerWeight, uint totalWeight) = stakingWeights(from, to, msg.sender);
       
        uint stakerQuota = stakerWeight.mul(precision).div(totalWeight);
        uint phaseInterval = to.sub(from);
        uint rewardRate = rewardRateForPhase(currentPhase);

        uint reward = stakerQuota.mul(phaseInterval).mul(rewardRate).div(precision);

        return (stakerQuota, phaseInterval, rewardRate, reward);
    }

    function getCurrentRewardPhase() internal view returns (RewardPhase memory)  {
        require(rewardPhases.length > 0, "No reward phase found");

        return rewardPhases[rewardPhases.length-1];
    }

    function stakingWeights(uint from, uint to, address stakerAddr) public view returns (uint staker, uint total) {

        uint stakerWeight = 0;
        uint totalWeight = 0;

        for (uint i=0; i<stakers.length; i++) {
            address addr = stakers[i];
            Stake[] memory stakesInfo = stakes[addr];

            uint weight = stakesWeight(stakesInfo, from, to);
            if (weight == 0) continue;

            totalWeight = totalWeight.add(weight);
            if (addr == stakerAddr) {
                stakerWeight = stakerWeight.add(weight);
            }
        }

        return (stakerWeight, totalWeight);
    }


    function stakesWeight(Stake[] memory stakesInfo, uint from, uint to) internal view returns (uint) {

        uint total = 0;
        for (uint j=0; j< stakesInfo.length; j++) {
            Stake memory stake = stakesInfo[j];

            // the interval we should consider for the staking period
            uint start = Math.max(from, stake.from);
            uint end = stake.to == 0 ? block.timestamp : Math.min(to, stake.to);

            // ensure start < end to process staking interval
            if (start >= end) continue;

            uint stakingInterval = end.sub(start);
            uint stakingWeight = stakingInterval.mul(stake.amount);
            total = total.add(stakingWeight);
        }

        return total;
    }


    function rewardRateForPhase(RewardPhase memory phase) internal pure returns (uint) {
        uint phaseInterval = phase.to.sub(phase.from);
        uint rate = phase.reward.div(phaseInterval);

        return rate;
    }


    // function transferReward(address sender, address recipient, uint amount) internal override {
    //     rewardToken.transferFrom(sender, recipient, amount);
    // }


    function reset() public override onlyOwner {
        for (uint i=0; i<rewardPhases.length; i++) {
            delete rewardPhases[i];
        }

        // return leftover rewards

        uint leftover = rewardBalance();
        rewardToken.transfer(msg.sender, leftover);

        super.reset();
    }


    function appendUintToString(string memory inStr, uint v) pure internal returns (string memory str) {
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (v != 0) {
            uint remainder = v % 10;
            v = v / 10;
            reversed[i++] = bytes1(uint8(48 + remainder));
        }
        bytes memory inStrb = bytes(inStr);
        bytes memory s = new bytes(inStrb.length + i);
        uint j;
        for (j = 0; j < inStrb.length; j++) {
            s[j] = inStrb[j];
        }
        for (j = 0; j < i; j++) {
            s[j + inStrb.length] = reversed[i - 1 - j];
        }
        str = string(s);
    }
}
