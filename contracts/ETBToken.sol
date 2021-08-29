
// https://bscscan.com/token/0x7ac64008fa000bfdc4494e0bfcc9f4eff3d51d2a?a=0x4F888d90c31c97efA63f0Db088578BB6F9D1970C#readContract
// name: Eat The Blocks Token
// symbol: ETB

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ETB is ERC20 {

    constructor() ERC20("Eat The Blocks Token", "ETB") {
        _mint(msg.sender, 1000000 * (10 ** decimals()));
    }
}