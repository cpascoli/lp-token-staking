// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";


contract StakingPool is Wallet  {

    using SafeMath for uint256;

    struct Stake {
        uint amount;
        uint time;
    }

    IERC20 internal rewardToken;

    mapping (address => Stake[]) public stakes;
    mapping (address => uint) public stakedBalances;


    constructor(address _rewardTokenAddress, address _lpTokenAddress) Wallet(_lpTokenAddress) {
         rewardToken = IERC20(_rewardTokenAddress);
    }

    // Setup Reqards phase
    // - rewards work in phases. We will vote periodically for a new phase of the staking reward. For each phase we will decide the amount of token distributed per day, and the duration

    function newRewardPhase(uint tokens, uint duration) public onlyOwner {

    }



    // Deposit ETB token reeards
    // - Since ETB has a fixed supply, the staking smart contract will have to be pre-funded with ETB tokens by the admin (Julien)
    function depositRewards() public onlyOwner {

    }

    function getStakedBalance() public view returns (uint) {
        return stakedBalances[msg.sender];
    }

    function getStakes() public view returns (Stake[] memory) {
        return stakes[msg.sender];
    }


    function startStake(uint amount) public {
        require(amount > 0, "Stake must be a positive amount greater than 0");
        require(balances[msg.sender] >= amount, "Not enough tokens to stake");

        // move staked tokens from account balance to stakedBalance
        balances[msg.sender] = balances[msg.sender].sub(amount);
        stakedBalances[msg.sender] = stakedBalances[msg.sender].add(amount);

        // add new stake amount and timestamp
        stakes[msg.sender].push(Stake(amount, block.timestamp));
    }

    // payout rewards
    // - profits are distributed automatically when someone exits the staking contract

    function endStake() public {

        require(stakedBalances[msg.sender] > 0, "No tokens sttaked");
        
        // calculate reward
        uint reward = calculateRewards();
 
        // return staked tokens from stakedBalance to the account balance 
        uint stakedAmount = stakedBalances[msg.sender];
        stakedBalances[msg.sender] = 0;
        balances[msg.sender] = balances[msg.sender].add(stakedAmount);

        // delete stake info
        delete stakes[msg.sender];

        // transfer reward
        transferReward(msg.sender, reward);
    }


    function depositAndStartStake(uint256 amount) public {
        deposit(amount);
        startStake(amount);
    }

    function endStakeAndWithdraw() public {
        endStake();
        withdraw(balances[msg.sender]);
     }


    // calculate rewards
    // - calculated proportionally to the time you spent in the pool, and your weight in the pool
    function calculateRewards() internal returns (uint) {

    }

    function transferReward(address recipient, uint amount) internal {
        rewardToken.transfer(recipient, amount);
    }

    function reset() public onlyOwner {
        // reset user balances
        for (uint i=0; i<usersArray.length; i++) {
            balances[usersArray[i]] = 0;
            stakedBalances[usersArray[i]] = 0;
            delete stakes[usersArray[i]];
        }
    }
}