// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract YieldRightNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    address public escrowVault;

    event EscrowVaultUpdated(address indexed previousEscrowVault, address indexed newEscrowVault);

    constructor(address initialOwner)
        ERC721("Yield Right", "YRT")
        Ownable(initialOwner)
    {}

    function setEscrowVault(address _escrow) external onlyOwner {
        require(_escrow != address(0), "Invalid escrow address");

        address previousEscrowVault = escrowVault;
        escrowVault = _escrow;

        emit EscrowVaultUpdated(previousEscrowVault, _escrow);
    }

    function mintYieldRight(address employer) external returns (uint256) {
        require(msg.sender == escrowVault, "Only Escrow Vault can mint");
        require(employer != address(0), "Invalid employer address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(employer, tokenId);

        return tokenId;
    }
}
