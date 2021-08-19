// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Wallet is Ownable {


    using SafeMath for uint256;

    IERC20 internal cakeLP;

    // CakeLP token balances
    mapping (address => uint256) public balances;

    address[] internal usersArray;
    mapping (address => bool) internal users;

    

    constructor(address _cakeLPTokenAddress) {
        cakeLP = IERC20(_cakeLPTokenAddress);
    }


    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }


    function deposit(uint256 amount) public {
        require(amount > 0, "Deposit amount should not be 0");
        require(cakeLP.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

        balances[msg.sender] = balances[msg.sender].add(amount);

        // remember addresses that deposited tokens
        if (!users[msg.sender]) {
            users[msg.sender] = true;
            usersArray.push(msg.sender);
        }
        
        cakeLP.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient token balance");

        balances[msg.sender] = balances[msg.sender].sub(amount);
        cakeLP.transfer(msg.sender, amount);
    }

}