// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";


contract StakingPool is Wallet  {

    using SafeMath for uint256;

    struct Stake {
        uint amount;
        uint from;
        uint to;
    }

    address[] public stakers; // addresses that have active stakes
    mapping (address => Stake[]) public stakes;  // active stakes info by address
    mapping (address => uint) public stakedBalances;

    constructor(address _rewardTokenAddress, address _lpTokenAddress) Wallet(_lpTokenAddress) {
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

        // remember new stakers and add new stake amount and timestamp
        if(stakes[msg.sender].length == 0) {
            stakers.push(msg.sender);
        }
        stakes[msg.sender].push(Stake(amount, block.timestamp, 0));
    }

    // payout rewards
    // - profits are distributed automatically when someone exits the staking contract

    function endStake() virtual public {

        require(stakedBalances[msg.sender] > 0, "No tokens staked");
        
        // return staked tokens from stakedBalance to the account balance 
        uint stakedAmount = stakedBalances[msg.sender];
        stakedBalances[msg.sender] = 0;
        balances[msg.sender] = balances[msg.sender].add(stakedAmount);

        // update last stake info
        Stake[] storage userStakes = stakes[msg.sender];
        Stake storage lastStake = userStakes[userStakes.length-1];
        lastStake.to = block.timestamp;

    }


    function depositAndStartStake(uint256 amount) public {
        deposit(amount);
        startStake(amount);
    }

    function endStakeAndWithdraw() public {
        endStake();
        withdraw(balances[msg.sender]);
     }


    function reset() public virtual onlyOwner {
        // reset user balances
        for (uint i=0; i<usersArray.length; i++) {
            balances[usersArray[i]] = 0;
            stakedBalances[usersArray[i]] = 0;
            delete stakes[usersArray[i]];
        }
    }
}