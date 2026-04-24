// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TesserateGovernanceToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    constructor(address initialOwner, address initialSupplyRecipient)
        ERC20("Tesserate Governance Token", "TGT")
        Ownable(initialOwner)
    {
        require(initialSupplyRecipient != address(0), "Invalid supply recipient");
        _mint(initialSupplyRecipient, MAX_SUPPLY);
    }
}
