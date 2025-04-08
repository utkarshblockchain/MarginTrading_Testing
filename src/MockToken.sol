// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimalsValue
    ) ERC20(name, symbol) {
        _decimals = decimalsValue;
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**decimalsValue);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
} 