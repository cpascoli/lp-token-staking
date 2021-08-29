
// https://bscscan.com/token/0xdb44c35cd6c378eb9e593d4c7243118064172fb2#readContract
// name: Pancake LPs
// symbol: Cake-LP

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CakeLP is ERC20 {

    constructor() ERC20("Pancake LPs", "Cake-LP") {
        _mint(msg.sender, 100 * (10 ** decimals()));
    }
}