// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 public immutable override decimals;
    string public constant override description = "Mock Aggregator";
    uint256 public constant override version = 1;

    int256 private _answer;
    uint80 private _roundId;
    uint256 private _updatedAt;

    /// @notice Cria um feed Chainlink falso com preco inicial.
    /// @dev Usado nos testes do ChainlinkPriceOracle.
    constructor(uint8 _decimals, int256 initialAnswer) {
        require(initialAnswer > 0, "Invalid initial answer");

        decimals = _decimals;
        _roundId = 1;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
    }

    /// @notice Troca o preco retornado pelo mock.
    /// @dev Usado em testes quando se quer simular um novo round de preco.
    function setAnswer(int256 newAnswer) external {
        require(newAnswer > 0, "Invalid answer");
        _roundId += 1;
        _answer = newAnswer;
        _updatedAt = block.timestamp;
    }

    /// @notice Troca manualmente o timestamp do preco.
    /// @dev Usado pelos testes para simular preco stale no oracle.
    function setUpdatedAt(uint256 newUpdatedAt) external {
        require(newUpdatedAt > 0, "Invalid timestamp");
        _updatedAt = newUpdatedAt;
    }

    /// @notice Retorna dados de um round especifico do mock.
    /// @dev Implementa a interface AggregatorV3Interface; nao e o caminho principal dos testes atuais.
    function getRoundData(
        uint80 roundId
    )
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        require(roundId <= _roundId && roundId > 0, "Round not available");
        return (roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }

    /// @notice Retorna o ultimo round do mock.
    /// @dev Chamado por ChainlinkPriceOracle.getLatestPrice nos testes.
    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }
}
