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


        uint totalRewardPaid; // the total reward paid in the reward phase
        uint pendingStaked; // the additional tokens staked since lastUpdated timestamp
        //uint averageAmountStakedTotal; // average tokens staked since start of staking period
        uint totalStakedWeight; // sum (tokens_staked * time_staked)
        uint lastUpdated; // when the total & average tokens staked were last updated
    }

    struct StakeReward {
        uint rewardPhaseId;  // the id of the reward phase that this stake belogs to
        uint rewardPaid;
    }

    IERC20 internal rewardToken;

    RewardPhase[] public rewardPhases;
    mapping(address => StakeReward[]) public stakeRewardPhase;

    uint constant quotaPrecision = 100 * 100 * 100;

    event RewardInfo(uint amountStaked, uint rewardRate, uint stakerQuota, uint stakeWeight, uint totalStakedWeight, uint totalRewardPaid, uint reward);
    event RewardUpdate(uint amountStaked, uint totalStakedWeight, uint pendingStaked, uint pendingInterval, uint pendingWeight, uint totalPendingStaked);
    event RewardCalcInfo(uint stakeAmount, uint rewardRate, uint stakedInterval, uint phaseInterval, uint stakeWeight, uint totalStakedWeight, uint totalRewardPaid, uint reward);

    constructor(address _rewardTokenAddress, address _lpTokenAddress) StakingPool(_rewardTokenAddress, _lpTokenAddress) {
        rewardToken = IERC20(_rewardTokenAddress);
    }

    // Setup Reqards phase
    // - rewards work in phases. We will vote periodically for a new phase of the staking reward. For each phase we will decide the amount of token distributed per day, and the duration
    function newRewardPhase(uint reward, uint from, uint to) public onlyOwner {
        require(reward > 0, "Invalid reward amount");
        require(to > from, "Invalid reward interval");
        require(rewardPhases.length == 0 || from > rewardPhases[rewardPhases.length-1].to, "Invalid phase start time");

        rewardPhases.push(RewardPhase(reward, from, to, 0, 0, 0, block.timestamp));
        
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


    function startStake(uint amount) public override {
        require(rewardPhases.length > 0, "No reward phase found");
        RewardPhase memory phase = rewardPhases[rewardPhases.length-1];
        require(phase.from <= block.timestamp && phase.to > block.timestamp, appendUintToString("No active reward phase found: ", block.timestamp));

        super.startStake(amount);  // 1699963246.

        uint t0 = Math.max(phase.lastUpdated, phase.from);
        uint pendingInterval =  block.timestamp.sub(t0);

        // stake weight := (token amount staked) * (time interval staked) 
        uint pendingStaked = phase.pendingStaked;
        uint pendingWeight = pendingStaked.mul(pendingInterval);
       
        // update average token staked so far
        RewardPhase storage currentPhase = rewardPhases[rewardPhases.length-1];
        currentPhase.totalStakedWeight = currentPhase.totalStakedWeight.add(pendingWeight);
        currentPhase.pendingStaked = currentPhase.pendingStaked.add(amount);
        currentPhase.lastUpdated = block.timestamp;

        emit RewardUpdate(amount, currentPhase.totalStakedWeight, pendingStaked, pendingInterval, pendingWeight, currentPhase.pendingStaked);

        stakeRewardPhase[msg.sender].push(StakeReward(rewardPhases.length, 0));
    }


    function endStake(uint stakeId) public override {
        require(rewardPhases.length > 0, "No reward phase found");
        RewardPhase memory phase = rewardPhases[rewardPhases.length-1];
        require(phase.from < block.timestamp && phase.to >= block.timestamp, appendUintToString("No active reward phase found: ", block.timestamp));
        
        Stake memory stake = stakes[msg.sender][stakeId-1];

        super.endStake(stakeId);

        uint pendingInterval =  block.timestamp.sub(phase.lastUpdated);

        // stake weight := (token amount staked) * (time interval staked) 
        uint pendingStaked = phase.pendingStaked;
        uint pendingWeight = pendingStaked.mul(pendingInterval);
       
        // update average token staked so far
        RewardPhase storage currentPhase = rewardPhases[rewardPhases.length-1];
        currentPhase.totalStakedWeight = currentPhase.totalStakedWeight.add(pendingWeight);
        currentPhase.pendingStaked = currentPhase.pendingStaked.sub(stake.amount);
        currentPhase.lastUpdated = block.timestamp;

        emit RewardUpdate(0, currentPhase.totalStakedWeight, pendingStaked, pendingInterval, pendingWeight, currentPhase.pendingStaked);

        // calculate reward
        (uint reward, uint rewardRate, uint amount, uint stakeWeight, uint totalStakedWeight) = calculateReward(stakeId);
        
        uint stakerQuota = quotaPrecision.mul(stakeWeight).div(totalStakedWeight);

        // transfer reward to the useer
        if (reward > 0) {
            uint balance = rewardBalance();
            require(balance >= reward, appendUintToString("not enough balance to pay reward: ", reward));

            // subtract the weight of the stake being paid 
            currentPhase.totalStakedWeight = currentPhase.totalStakedWeight.sub(stakeWeight);
            currentPhase.totalRewardPaid = currentPhase.totalRewardPaid.add(reward);
            emit RewardInfo(amount, rewardRate, stakerQuota, stakeWeight, totalStakedWeight, currentPhase.totalRewardPaid, reward);

            //stakeRewardPhase[msg.sender][stakeId-1].rewardPaid = reward;
            rewardToken.transfer(msg.sender, reward);
        }
    }


    // calculate rewards
    // - calculated proportionally to the time you spent in the pool, and your weight in the pool
    function calculateReward(uint stakeId) public returns(uint, uint, uint, uint, uint) {
        require(stakeId != 0, "StakeId can't be 0");
        require(stakeId <= stakes[msg.sender].length, "stakeId not found");
        require(stakeId <= stakeRewardPhase[msg.sender].length, "reward phase not found for stake");
        Stake memory stake = stakes[msg.sender][stakeId-1];
        require(stake.to != 0, "Stake not ended. Can't calculate reward.");

        StakeReward memory stakeReward = stakeRewardPhase[msg.sender][stakeId-1];

        // reward phase associated to the stake 
        RewardPhase memory rewardPhase = rewardPhases[stakeReward.rewardPhaseId - 1];
        uint stakeEnd = Math.min(stake.to, rewardPhase.to);
        uint stakedInterval = stakeEnd.sub(stake.from);
        uint stakeWeight = stake.amount.mul(stakedInterval);
        uint totalStakedWeight = rewardPhase.totalStakedWeight;

        uint phaseInterval = stakeEnd.sub(rewardPhase.from);

        uint rewardRate = rewardRateForPhase(rewardPhase);
        uint availableReaward = rewardRate.mul(phaseInterval).sub(rewardPhase.totalRewardPaid);

        require(stakeWeight <= totalStakedWeight, "Invalid stake weight");

        uint reward = availableReaward.mul(stakeWeight).div(totalStakedWeight);

        // calculate reward for this stake
        // if this is the only activ stake than the reward is based on the stake interval
        // else we calculate the reward proportionally to the relative weight of this stake and the remaining reward accrued iso far in the reward phase
        // uint reward = (stakeWeight == totalStakedWeight) ?  rewardRate.mul(stakedInterval) : 
        //                                                     availableReaward.mul(stakeWeight).div(totalStakedWeight);

        emit RewardCalcInfo(stake.amount, rewardRate, stakedInterval, phaseInterval, stakeWeight, totalStakedWeight, rewardPhase.totalRewardPaid, reward);

        return (reward, rewardRate, stake.amount, stakeWeight, totalStakedWeight);
    }
 

    function getCurrentRewardPhase() internal view returns (RewardPhase memory)  {
        require(rewardPhases.length > 0, "No reward phase found");

        return rewardPhases[rewardPhases.length-1];
    }

    
    function rewardRateForPhase(RewardPhase memory phase) internal pure returns (uint) {
        uint phaseInterval = phase.to.sub(phase.from);
        uint rate = phase.reward.div(phaseInterval);

        return rate;
    }


    function reset() public override onlyOwner {
        for (uint i=0; i<rewardPhases.length; i++) {
            delete rewardPhases[i];
        }
        
        for (uint i=0; i<usersArray.length; i++) {
            delete stakeRewardPhase[usersArray[i]];
        }

        // return leftover rewards to owner
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
