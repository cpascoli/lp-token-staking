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
    mapping (address => Stake[]) public stakes;

    uint public totalStakes;
 

    constructor(address _rewardTokenAddress, address _lpTokenAddress) Wallet(_lpTokenAddress) {
    }


    function getStakeInfo(uint stakeId) public view returns (Stake memory) {
        require(stakeId != 0, "Invald stakeId");
        require(stakes[msg.sender].length >= stakeId, "Stake not found");

        return stakes[msg.sender][stakeId - 1];
    }


    function startStake(uint amount) virtual public {
        require(amount > 0, "Stake must be a positive amount greater than 0");
        require(balances[msg.sender] >= amount, "Not enough tokens to stake");

        // move staked tokens from account balance to stakedBalance
        balances[msg.sender] = balances[msg.sender].sub(amount);

        // remember new stakers and add new stake amount and timestamp
        if(stakes[msg.sender].length == 0) {
            stakers.push(msg.sender);
        }
        // add new srake info
        stakes[msg.sender].push( Stake(amount, block.timestamp, 0) );
       
        totalStakes = totalStakes.add(amount);
    }

    // payout rewards
    // - profits are distributed automatically when someone exits the staking contract

    function endStake(uint stakeId) virtual public {
        require(stakeId != 0, "StakeId can't be 0");
        require(stakeId <= stakes[msg.sender].length, "Stake Id not found");
        require(stakes[msg.sender][stakeId-1].to == 0, "Stake already ended");

        Stake storage stake = stakes[msg.sender][stakeId-1];
        stake.to = block.timestamp;

        // return lp tokens to unstaked balance
        balances[msg.sender] = balances[msg.sender].add(stake.amount);

        totalStakes = totalStakes.sub(stake.amount);
    }

    function getStakes() public view returns (Stake[] memory) {
        return stakes[msg.sender];
    }


    function getStakedBalance() view public returns (uint) {
        uint total = 0;

        Stake[] memory userStakes = stakes[msg.sender];
        for (uint i=0; i<userStakes.length; i++) {
            if (userStakes[i].to == 0) {
                total = total.add(userStakes[i].amount);
            }
        }

        return total;
    }

    function depositAndStartStake(uint256 amount) public {
        deposit(amount);
        startStake(amount);
    }

    function endStakeAndWithdraw(uint stakeId) public {
        endStake(stakeId);
        withdraw(balances[msg.sender]);
     }


    function reset() public virtual onlyOwner {
        // reset user balances and stakes
        for (uint i=0; i < usersArray.length; i++) {
            balances[usersArray[i]] = 0;
            delete stakes[usersArray[i]];
        }
        totalStakes = 0;
    }
}