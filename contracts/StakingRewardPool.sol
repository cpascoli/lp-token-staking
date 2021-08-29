// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./StakingPool.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";


contract StakingRewardPool is StakingPool  {

    using SafeMath for uint256;

    struct RewardPhase {
        uint id;

        uint reward;
        uint from;
        uint to;

        uint totalRewardPaid; // the total reward paid in the reward phase
        uint pendingStaked; // tokens currently staked
        //uint averageAmountStakedTotal; // average tokens staked since start of staking period
        uint totalStakedWeight; // sum (tokens_staked * time_staked)
        uint lastUpdated; // when the totalStakedWeight was last updated (after last stake was ended)
    }

    struct StakeReward {
        uint rewardPhaseId;  // the id of the reward phase that this stake belogs to
        uint rewardPaid;
    }

    struct RewardInfo {
        uint reward;
        uint rewardRate;
        uint stakeAmount;
        uint stakedInterval;
        uint stakeWeight;
        uint totalStakedWeight;
    }

    IERC20 internal rewardToken;

    RewardPhase[] public rewardPhases;
    mapping(address => StakeReward[]) public stakeRewardPhase;

    uint constant quotaPrecision = 100 * 100 * 100;

    //event RewardInfo(uint amountStaked, uint rewardRate, uint stakerQuota, uint stakeWeight, uint totalStakedWeight, uint totalRewardPaid, uint reward);
    event RewardUpdate(uint amountStaked, uint totalStakedWeight, uint pendingStaked, uint pendingInterval, uint pendingWeight, uint totalPendingStaked);
    event RewardCalcInfo(uint stakeAmount, uint rewardRate, uint stakedInterval, uint phaseInterval, uint stakeWeight, uint totalStakedWeight, uint totalRewardPaid, uint reward);

    constructor(address _rewardTokenAddress, address _lpTokenAddress) StakingPool(_rewardTokenAddress, _lpTokenAddress) {
        rewardToken = IERC20(_rewardTokenAddress);
    }

    
    function getStakeRewardPhases() public view returns (StakeReward[] memory)  {

        return stakeRewardPhase[msg.sender];
    }
    
    function rewardRateForPhase(RewardPhase memory phase) internal pure returns (uint) {
        uint phaseInterval = phase.to.sub(phase.from);
        uint rate = phase.reward.div(phaseInterval);

        return rate;
    }


    // Setup Reqards phase
    // - rewards work in phases. We will vote periodically for a new phase of the staking reward. For each phase we will decide the amount of token distributed per day, and the duration
    function newRewardPhase(uint reward, uint from, uint to) public onlyOwner {
        require(reward > 0, "Invalid reward amount");
        require(to > from, "Invalid reward interval");
        require(rewardPhases.length == 0 || from > rewardPhases[rewardPhases.length-1].to, "Invalid phase start time");

        rewardPhases.push(RewardPhase(rewardPhases.length+1, reward, from, to, 0, 0, 0, block.timestamp));
        
        depositReward(reward);
    }

    function deleteRewardPhase(uint index) public onlyOwner {
        require(rewardPhases.length > index, "Invalid reward phase index");
        for (uint i=index; i<rewardPhases.length-1; i++) {
            rewardPhases[i] = rewardPhases[i+1];
        }
        rewardPhases.pop();
    }

    function rewardPhasesCount() public view returns (uint) {
        return rewardPhases.length;
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
        uint phaseId = getCurrentRewardPhaseId();
        require(phaseId > 0, "No active reward phase found");

        super.startStake(amount);

        RewardPhase storage phase = rewardPhases[phaseId-1];
        uint t0 = Math.max(phase.lastUpdated, phase.from);
        uint pendingInterval = block.timestamp.sub(t0);

        // stake weight := (token amount staked) * (time interval staked) 
        uint pendingStaked = phase.pendingStaked;
        uint pendingWeight = phase.pendingStaked.mul(pendingInterval);
       
        // update average token staked so far
        phase.totalStakedWeight = phase.totalStakedWeight.add(pendingWeight);
        phase.pendingStaked = phase.pendingStaked.add(amount);
        phase.lastUpdated = block.timestamp;

        emit RewardUpdate(amount, phase.totalStakedWeight, pendingStaked, pendingInterval, pendingWeight, phase.pendingStaked);

        // associate the stake to the current reward phase
        stakeRewardPhase[msg.sender].push(StakeReward(phase.id, 0));
    }




    function endStake(uint stakeId) public override {
        require(rewardPhases.length > 0, "No reward phase found");

        // get the reward phase associated to the stake
        StakeReward memory stakeReward = stakeRewardPhase[msg.sender][stakeId-1];
        RewardPhase memory phase = rewardPhases[stakeReward.rewardPhaseId-1];
        require(phase.from > 0 && phase.to > 0, appendUintToString("No active reward phase found: ", block.timestamp));
        
        Stake memory stake = stakes[msg.sender][stakeId-1];

        super.endStake(stakeId);

        // calculate reward
        RewardInfo memory rewardInfo = calculateReward(stakeId);
        
        // uint pendingStakedUpdated = phase.pendingStaked.sub(stake.amount);
        // uint totalStakedWeightUpdated = phase.totalStakedWeight.add(pendingWeight);

        RewardPhase storage currentPhase = rewardPhases[stakeReward.rewardPhaseId-1];
        currentPhase.pendingStaked = phase.pendingStaked.sub(stake.amount);
        currentPhase.totalStakedWeight = rewardInfo.totalStakedWeight; //totalStakedWeightUpdated;
        currentPhase.lastUpdated = block.timestamp;

        //uint stakerQuota = quotaPrecision.mul(rewardInfo.stakeWeight).div(rewardInfo.totalStakedWeight);
        if (rewardInfo.reward > 0) {
            payReward(msg.sender, rewardInfo, stakeId, stakeReward.rewardPhaseId);
        }
    }



    // calculate rewards  proportionally to the time the stake spend in the pool, 
    // and the relative weight of the stake in the pool so far
    function calculateReward(uint stakeId) public view returns (RewardInfo memory) {
        require(stakeId != 0, "StakeId can't be 0");
        require(stakeId <= stakes[msg.sender].length, "stakeId not found");
        require(stakeId <= stakeRewardPhase[msg.sender].length, "reward phase not found for stake");
        Stake memory stake = stakes[msg.sender][stakeId-1];

        // get the reward phase associated to the stake 
        StakeReward memory stakeReward = stakeRewardPhase[msg.sender][stakeId-1];
        RewardPhase memory rewardPhase = rewardPhases[stakeReward.rewardPhaseId - 1];

        // Calculate stakeWeight := stake_amount * stake_interval
        // the stakedInterval used to calculate the reward for this stake depends on 
        // whether the stake ended and the end date of the reward phase:
        // 
        // 1. the stake ended (e.g stake.to > 0) for the end interval we use  min(stake.to, rewardPhase.to)
        // 2. the stake did not end (e.g stake.to == 0) or the end interval we use min(block.stimestamp, rewardPhase.to)
        uint stakeEnd = Math.min((stake.to > 0)? stake.to : block.timestamp, rewardPhase.to);
        uint stakedInterval = stakeEnd.sub(stake.from);
        uint stakeWeight = stake.amount.mul(stakedInterval);

        // Calculate pendingWeight := pendingStaked * pendingInterval
        // pendingStaked includes the amount staked by this stake
        uint pendingInterval = Math.min(rewardPhase.to, block.timestamp).sub(Math.min(rewardPhase.lastUpdated, rewardPhase.to));
        uint pendingWeight = rewardPhase.pendingStaked.mul(pendingInterval);

        // add pendingWeight to totalStakedWeight
        uint totalStakedWeight = rewardPhase.totalStakedWeight.add(pendingWeight);

        // Calculate available reward
        // the time interval between the start of the reward phase and the time used to calculate the reward fot this stake
        uint phaseInterval = stakeEnd.sub(rewardPhase.from);

        uint rewardRate = rewardRateForPhase(rewardPhase);
        uint availableReaward = rewardRate.mul(phaseInterval).sub(rewardPhase.totalRewardPaid);

        // require(stakeWeight <= totalStakedWeight, "Invalid stake weight");
        if (stakeWeight > totalStakedWeight) {
            return RewardInfo(0, rewardRate, stake.amount, stakedInterval, stakeWeight, totalStakedWeight);
        }

        // Calculate reward
        uint reward =  (totalStakedWeight == 0)? 0 : availableReaward.mul(stakeWeight).div(totalStakedWeight);

        // calculate reward for this stake
        // if this is the only activ stake than the reward is based on the stake interval
        // else we calculate the reward proportionally to the relative weight of this stake and the remaining reward accrued iso far in the reward phase
        // uint reward = (stakeWeight == totalStakedWeight) ?  rewardRate.mul(stakedInterval) : 
        //                                                     availableReaward.mul(stakeWeight).div(totalStakedWeight);

        // emit RewardCalcInfo(stake.amount, rewardRate, stakedInterval, phaseInterval, stakeWeight, totalStakedWeight, rewardPhase.totalRewardPaid, reward);

        return RewardInfo(reward, rewardRate, stake.amount, stakedInterval, stakeWeight, totalStakedWeight);
    }


    function payReward(address account, RewardInfo memory rewardInfo, uint stakeId, uint rewardPhaseId) internal {

        // transfer reward to the useer
        uint balance = rewardBalance();
        require(balance >= rewardInfo.reward, appendUintToString("not enough balance to pay reward: ", rewardInfo.reward));

        RewardPhase storage currentPhase = rewardPhases[rewardPhaseId-1];

        // subtract the weight of the stake being paid 
        currentPhase.totalStakedWeight = currentPhase.totalStakedWeight.sub(rewardInfo.stakeWeight);
        currentPhase.totalRewardPaid = currentPhase.totalRewardPaid.add(rewardInfo.reward);
        //emit RewardInfo(amount, rewardRate, stakerQuota, stakeWeight, totalStakedWeight, currentPhase.totalRewardPaid, reward);

        StakeReward storage stakeReward = stakeRewardPhase[account][stakeId-1];
        stakeReward.rewardPaid = rewardInfo.reward;

        rewardToken.transfer(account, rewardInfo.reward);

    }

    function getCurrentRewardPhaseId() public view returns (uint) {
        if (rewardPhases.length == 0) return 0;
        for (uint i=rewardPhases.length; i>0; i--) {
            RewardPhase memory phase = rewardPhases[i-1];
            if (phase.from <= block.timestamp && phase.to >= block.timestamp) {
                return phase.id;
            }
        }
        return 0;
    }

    function getTimestamp() public view returns (uint) {
        return block.timestamp;
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
