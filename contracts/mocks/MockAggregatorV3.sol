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

    constructor(uint8 _decimals, int256 initialAnswer) {
        require(initialAnswer > 0, "Invalid initial answer");

        decimals = _decimals;
        _roundId = 1;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
    }

    function setAnswer(int256 newAnswer) external {
        require(newAnswer > 0, "Invalid answer");
        _roundId += 1;
        _answer = newAnswer;
        _updatedAt = block.timestamp;
    }

    function setUpdatedAt(uint256 newUpdatedAt) external {
        require(newUpdatedAt > 0, "Invalid timestamp");
        _updatedAt = newUpdatedAt;
    }

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

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }
}
