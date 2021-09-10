// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./StakingPool.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";

/**
 * Pool contract to distribute reward tokens among LP token stakers proportionally to the amount and duration of the their stakes.
 * The owner can setup multiple reward periods each one with a pre-allocated amount of reward tokens to be distributed.
 * Users are free to add and remove tokens to their stake at any time.
 * Users can also claim their pending reward at any time.

 * The pool implements an efficient O(1) algo to distribute the rewards based on this paper:
 * https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf
 */
contract StakingRewardPool is StakingPool  {

    using SafeMath for uint256;

    event RewardPaid(address indexed user, uint256 reward);

    struct RewardPeriod {
        uint id;
        uint reward;
        uint from;
        uint to;
        uint lastUpdated; // when the totalStakedWeight was last updated (after last stake was ended)
        uint totalStaked; // T: sum of all active stake deposits
        uint rewardPerTokenStaked; // S: SUM(reward/T) - sum of all rewards distributed divided all active stakes
        uint totalRewardsPaid; 
    }

    struct UserInfo {
        uint userRewardPerTokenStaked;
        uint pendingRewards;
        uint rewardsPaid;
    }

    struct RewardsStats {
        // user stats
        uint claimableRewards;
        uint rewardsPaid;
        // general stats
        uint rewardRate;
        uint totalRewardsPaid;
    }


    IERC20 internal rewardToken;
    RewardPeriod[] public rewardPeriods;
    uint rewardPeriodsCount = 0;


    mapping(address => UserInfo) userInfos;

    // mapping(address => uint) userRewardPerTokenStaked;
    // mapping (address => uint) pendingRewards;

    uint constant rewardPrecision = 1e9;


    constructor(address _rewardTokenAddress, address _lpTokenAddress) StakingPool(_rewardTokenAddress, _lpTokenAddress) {
        rewardToken = IERC20(_rewardTokenAddress);
    }


    function newRewardPeriod(uint reward, uint from, uint to) public onlyOwner {
        require(reward > 0, "Invalid reward period amount");
        require(to > from && to > block.timestamp, "Invalid reward period interval");
        require(rewardPeriods.length == 0 || from > rewardPeriods[rewardPeriods.length-1].to, "Invalid period start time");

        rewardPeriods.push(RewardPeriod(rewardPeriods.length+1, reward, from, to, block.timestamp, 0, 0, 0));
        rewardPeriodsCount = rewardPeriods.length;
        depositReward(reward);
    }


    function getRewardPeriodsCount() public view returns(uint) {
        return rewardPeriodsCount;
    }


    function deleteRewardPeriod(uint index) public onlyOwner {
        require(rewardPeriods.length > index, "Invalid reward phase index");
        for (uint i=index; i<rewardPeriods.length-1; i++) {
            rewardPeriods[i] = rewardPeriods[i+1];
        }
        rewardPeriods.pop();
        rewardPeriodsCount = rewardPeriods.length;
    }


    function rewardBalance() public view returns (uint) {
        return rewardToken.balanceOf(address(this));
    }


    // Deposit ETB token rewards into this contract
    function depositReward(uint amount) internal onlyOwner {
        rewardToken.transferFrom(msg.sender, address(this), amount);
    }


    function startStake(uint amount) public override {
        uint periodId = getCurrentRewardPeriodId();
        require(periodId > 0, "No active reward period found");
        update();

        super.startStake(amount);

        // update total tokens staked
        RewardPeriod storage period = rewardPeriods[periodId-1];
        period.totalStaked = period.totalStaked.add(amount);
    }

    function endStake(uint amount) public override {
        update();
        super.endStake(amount);

        // update total tokens staked
        uint periodId = getCurrentRewardPeriodId();
        RewardPeriod storage period = rewardPeriods[periodId-1];
        period.totalStaked = period.totalStaked.sub(amount);
        
        claim();
    }

    function claimableReward() view public returns (uint) {
        uint periodId = getCurrentRewardPeriodId();
        if (periodId == 0) return 0;

        RewardPeriod memory period = rewardPeriods[periodId-1];
        uint newRewardDistribution = calculateRewardDistribution(period);
        uint reward = calculateReward(newRewardDistribution);

        UserInfo memory userInfo = userInfos[msg.sender];
        uint pending = userInfo.pendingRewards;

        return pending.add(reward);
    }
 
    function claimReward() public {
        update();
        claim();
    }

    function claim() internal {
        UserInfo storage userInfo = userInfos[msg.sender];
        uint rewards = userInfo.pendingRewards;
        if (rewards != 0) {
            userInfo.pendingRewards = 0;

            uint periodId = getCurrentRewardPeriodId();
            RewardPeriod storage period = rewardPeriods[periodId-1];
            period.totalRewardsPaid = period.totalRewardsPaid.add(rewards);

            payReward(msg.sender, rewards);
        }
    }

    function getCurrentRewardPeriodId() public view returns (uint) {
        if (rewardPeriodsCount == 0) return 0;
        for (uint i=rewardPeriods.length; i>0; i--) {
            RewardPeriod memory period = rewardPeriods[i-1];
            if (period.from <= block.timestamp && period.to >= block.timestamp) {
                return period.id;
            }
        }
        return 0;
    }


    function getRewardsStats() public view returns (RewardsStats memory) {
        UserInfo memory userInfo = userInfos[msg.sender];

        RewardsStats memory stats = RewardsStats(0, 0, 0, 0);
        // user stats
        stats.claimableRewards = claimableReward();
        stats.rewardsPaid = userInfo.rewardsPaid;

        // reward period stats
        uint periodId = getCurrentRewardPeriodId();
        if (periodId > 0) {
            RewardPeriod memory period = rewardPeriods[periodId-1];
            stats.rewardRate = rewardRate(period);
            stats.totalRewardsPaid = period.totalRewardsPaid;
        }

        return stats;
    }


    function rewardRate(RewardPeriod memory period) internal pure returns (uint) {
        uint duration = period.to.sub(period.from);
        return period.reward.div(duration);
    }

    function payReward(address account, uint reward) internal {
        UserInfo storage userInfo = userInfos[msg.sender];
        userInfo.rewardsPaid = userInfo.rewardsPaid.add(reward);
        rewardToken.transfer(account, reward);

        emit RewardPaid(account, reward);
    }


    /// Reward calcualtion logic

    function update() internal {
        uint periodId = getCurrentRewardPeriodId();
        require(periodId > 0, "No active reward period found");

        RewardPeriod storage period = rewardPeriods[periodId-1];
        uint rewardDistribuedPerToken = calculateRewardDistribution(period);

        // update pending rewards reward since rewardPerTokenStaked was updated
        uint reward = calculateReward(rewardDistribuedPerToken);
        UserInfo storage userInfo = userInfos[msg.sender];
        userInfo.pendingRewards = userInfo.pendingRewards.add(reward);
        userInfo.userRewardPerTokenStaked = rewardDistribuedPerToken;

        require(rewardDistribuedPerToken >= period.rewardPerTokenStaked, "Reward distribution should be monotonic increasing");

        period.rewardPerTokenStaked = rewardDistribuedPerToken;
        period.lastUpdated = block.timestamp;
    }


    function calculateRewardDistribution(RewardPeriod memory period) view internal returns (uint) {

        // calculate total reward to be distributed since period.lastUpdated
        uint rate = rewardRate(period);
        uint deltaTime = block.timestamp.sub(period.lastUpdated);
        uint reward = deltaTime.mul(rate);

        uint newRewardPerTokenStaked = period.rewardPerTokenStaked;  // 0
        if (period.totalStaked != 0) {
            // S = S + r / T
            newRewardPerTokenStaked = period.rewardPerTokenStaked.add( 
                reward.mul(rewardPrecision).div(period.totalStaked)
            );
        }

        return newRewardPerTokenStaked;
    }


    function calculateReward(uint rewardDistribution) internal view returns (uint) {
        if (rewardDistribution == 0) return 0;

        uint staked = stakes[msg.sender];
        UserInfo memory userInfo = userInfos[msg.sender];
        uint reward = staked.mul(
            rewardDistribution.sub(userInfo.userRewardPerTokenStaked)
        ).div(rewardPrecision);

        return reward;
    }


    // HELPERS - Used in tests

    function reset() public override onlyOwner {
        for (uint i=0; i<rewardPeriods.length; i++) {
            delete rewardPeriods[i];
        }
        rewardPeriodsCount = 0;
        for (uint i=0; i<usersArray.length; i++) {
            delete userInfos[usersArray[i]];
        }
        // return leftover rewards to owner
        uint leftover = rewardBalance();
        rewardToken.transfer(msg.sender, leftover);
        super.reset();
    }

}
