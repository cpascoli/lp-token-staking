// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";


contract StakingPool is Wallet  {

    using SafeMath for uint256;

    event Staked(address indexed user, uint amount);
    event UnStaked(address indexed user, uint256 amount);

    address[] public stakers; // addresses that have active stakes
    mapping (address => uint) public stakes;
    uint public totalStakes;
 
    constructor(address _rewardTokenAddress, address _lpTokenAddress) Wallet(_lpTokenAddress) {}


    function depositAndStartStake(uint256 amount) public {
        deposit(amount);
        startStake(amount);
    }


    function endStakeAndWithdraw(uint amount) public {
        endStake(amount);
        withdraw(amount);
    }


    function startStake(uint amount) virtual public {
        require(amount > 0, "Stake must be a positive amount greater than 0");
        require(balances[msg.sender] >= amount, "Not enough tokens to stake");

        // move tokens from lp token balance to the staked balance
        balances[msg.sender] = balances[msg.sender].sub(amount);
        stakes[msg.sender] = stakes[msg.sender].add(amount); 
       
        totalStakes = totalStakes.add(amount);

        emit Staked(msg.sender, amount);
    }


    function endStake(uint amount) virtual public {
        require(stakes[msg.sender] >= amount, "Not enough tokens staked");

        // return lp tokens to lp token balance
        balances[msg.sender] = balances[msg.sender].add(amount);
        stakes[msg.sender] = stakes[msg.sender].sub(amount); 

        totalStakes = totalStakes.sub(amount);

        emit UnStaked(msg.sender, amount);
    }


    function getStakedBalance() public view returns (uint) {
        return stakes[msg.sender];
    }


    function reset() public virtual onlyOwner {
        // reset user balances and stakes
        for (uint i=0; i < usersArray.length; i++) {
            balances[usersArray[i]] = 0;
            stakes[usersArray[i]] = 0;
        }
        totalStakes = 0;
    }
}