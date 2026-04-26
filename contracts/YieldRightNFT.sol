// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract YieldRightNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    address public escrowVault;

    event EscrowVaultUpdated(address indexed previousEscrowVault, address indexed newEscrowVault);

    /// @notice Cria o NFT de direito ao rendimento.
    /// @dev Usado no deploy. O initialOwner configura qual EscrowVault pode mintar.
    constructor(address initialOwner)
        ERC721("Yield Right", "YRT")
        Ownable(initialOwner)
    {}

    /// @notice Define o EscrowVault autorizado a mintar YieldRightNFTs.
    /// @dev Chamado pelo owner depois do deploy, no modulo Ignition e nos testes.
    function setEscrowVault(address _escrow) external onlyOwner {
        require(_escrow != address(0), "Invalid escrow address");
        require(escrowVault == address(0), "Escrow Vault already set");

        address previousEscrowVault = escrowVault;
        escrowVault = _escrow;

        emit EscrowVaultUpdated(previousEscrowVault, _escrow);
    }

    /// @notice Cria um YieldRightNFT para a empresa.
    /// @dev Chamado somente por EscrowVault.deposit. Esse NFT sera usado em claimYield.
    function mintYieldRight(address employer) external returns (uint256) {
        require(msg.sender == escrowVault, "Only Escrow Vault can mint");
        require(employer != address(0), "Invalid employer address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(employer, tokenId);

        return tokenId;
    }
}
