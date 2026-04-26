// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableERC20 is IERC20 {
    /// @notice Cria tokens no mock.
    /// @dev Usado por MockAavePool.accrueYield para simular rendimento disponivel.
    function mint(address to, uint256 amount) external;
}

contract MockAavePool {
    uint256 private constant RAY = 1e27;

    mapping(address => uint256) public totalSupplied;
    mapping(address => uint256) public reserveNormalizedIncome;

    /// @notice Simula o deposito na Aave.
    /// @dev Chamado por EscrowVault.deposit nos testes para receber o token de pagamento.
    function supply(address asset, uint256 amount, address, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        totalSupplied[asset] += amount;

        if (reserveNormalizedIncome[asset] == 0) {
            reserveNormalizedIncome[asset] = RAY;
        }
    }

    /// @notice Simula o saque da Aave.
    /// @dev Chamado por EscrowVault.releasePayment e claimYield nos testes.
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        uint256 available = totalSupplied[asset];
        uint256 withdrawn = amount > available ? available : amount;

        totalSupplied[asset] = available - withdrawn;
        IERC20(asset).transfer(to, withdrawn);

        return withdrawn;
    }

    /// @notice Retorna o indice de rendimento simulado.
    /// @dev Chamado por EscrowVault.deposit e pelo calculo de yield no EscrowVault.
    function getReserveNormalizedIncome(address asset) external view returns (uint256) {
        uint256 currentIncome = reserveNormalizedIncome[asset];
        return currentIncome == 0 ? RAY : currentIncome;
    }

    /// @notice Ajusta manualmente o indice de rendimento do ativo.
    /// @dev Chamado pelos testes para simular que o deposito rendeu.
    function setReserveNormalizedIncome(address asset, uint256 newIncome) external {
        uint256 currentIncome = reserveNormalizedIncome[asset];
        if (currentIncome == 0) {
            currentIncome = RAY;
        }

        require(newIncome >= currentIncome, "Income index cannot decrease");
        reserveNormalizedIncome[asset] = newIncome;
    }

    /// @notice Cria tokens extras dentro do mock para representar yield.
    /// @dev Chamado pelos testes antes de claimYield, para o pool ter saldo suficiente.
    function accrueYield(address asset, uint256 amount) external {
        IMintableERC20(asset).mint(address(this), amount);
        totalSupplied[asset] += amount;
    }
}
