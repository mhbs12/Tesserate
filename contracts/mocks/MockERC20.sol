// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    /// @notice Cria um ERC20 falso para testes.
    /// @dev Usado como token de pagamento nos testes do EscrowVault.
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    /// @notice Cria tokens livremente no mock.
    /// @dev Usado pelos testes para dar saldo a usuarios e pelo MockAavePool para simular yield.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
