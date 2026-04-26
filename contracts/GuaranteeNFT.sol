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

    /// @notice Cria o NFT de garantia do principal.
    /// @dev Usado no deploy. O initialOwner configura qual EscrowVault pode mintar e marcar como pago.
    constructor(address initialOwner)
        ERC721("Payment Guarantee", "PGT")
        Ownable(initialOwner)
    {}

    /// @notice Define o EscrowVault autorizado a mintar e marcar NFTs como pagos.
    /// @dev Chamado pelo owner depois do deploy, no modulo Ignition e nos testes.
    function setEscrowVault(address _escrow) external onlyOwner {
        require(_escrow != address(0), "Invalid escrow address");
        require(escrowVault == address(0), "Escrow Vault already set");

        address previousEscrowVault = escrowVault;
        escrowVault = _escrow;

        emit EscrowVaultUpdated(previousEscrowVault, _escrow);
    }

    /// @notice Cria um GuaranteeNFT para o funcionario.
    /// @dev Chamado somente por EscrowVault.deposit. Esse NFT sera usado em releasePayment.
    function mintGuarantee(address employee) external returns (uint256) {
        require(msg.sender == escrowVault, "Only Escrow Vault can mint");
        require(employee != address(0), "Invalid employee address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(employee, tokenId);

        return tokenId;
    }

    /// @notice Marca o GuaranteeNFT como ja pago.
    /// @dev Chamado somente por EscrowVault.releasePayment depois de transferir o principal.
    function markAsPaid(uint256 tokenId) external {
        require(msg.sender == escrowVault, "Only Escrow Vault can mark as paid");
        ownerOf(tokenId);

        isPaid[tokenId] = true;

        emit GuaranteeMarkedAsPaid(tokenId);
    }
}
