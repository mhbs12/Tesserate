// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract GuaranteeNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    mapping(uint256 => bool) public isPaid;
    address public escrowVault;

    event EscrowVaultUpdated(address indexed previousEscrowVault, address indexed newEscrowVault);
    event GuaranteeMarkedAsPaid(uint256 indexed tokenId);

    constructor(address initialOwner)
        ERC721("Payment Guarantee", "PGT")
        Ownable(initialOwner)
    {}

    function setEscrowVault(address _escrow) external onlyOwner {
        require(_escrow != address(0), "Invalid escrow address");

        address previousEscrowVault = escrowVault;
        escrowVault = _escrow;

        emit EscrowVaultUpdated(previousEscrowVault, _escrow);
    }

    function mintGuarantee(address employee) external returns (uint256) {
        require(msg.sender == escrowVault, "Only Escrow Vault can mint");
        require(employee != address(0), "Invalid employee address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(employee, tokenId);

        return tokenId;
    }

    function markAsPaid(uint256 tokenId) external {
        require(msg.sender == escrowVault, "Only Escrow Vault can mark as paid");
        ownerOf(tokenId);

        isPaid[tokenId] = true;

        emit GuaranteeMarkedAsPaid(tokenId);
    }
}
