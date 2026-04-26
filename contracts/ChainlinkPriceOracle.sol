// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceOracle is Ownable {
    mapping(address => AggregatorV3Interface) public priceFeeds;
    uint256 public maxPriceAge;

    event PriceFeedUpdated(address indexed token, address indexed previousFeed, address indexed newFeed);
    event MaxPriceAgeUpdated(uint256 previousMaxPriceAge, uint256 newMaxPriceAge);

    /// @notice Cria o contrato de oracle e define idade maxima aceita para precos.
    /// @dev Usado no deploy. Este oracle e separado do fluxo atual do EscrowVault.
    constructor(address initialOwner, uint256 _maxPriceAge) Ownable(initialOwner) {
        require(_maxPriceAge > 0, "Invalid max price age");
        maxPriceAge = _maxPriceAge;
    }

    /// @notice Associa um token a um feed Chainlink.
    /// @dev Chamado pelo owner. getLatestPrice e getUsdValue dependem dessa configuracao.
    function setPriceFeed(address token, address feed) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(feed != address(0), "Invalid feed");

        address previousFeed = address(priceFeeds[token]);
        priceFeeds[token] = AggregatorV3Interface(feed);

        emit PriceFeedUpdated(token, previousFeed, feed);
    }

    /// @notice Altera a idade maxima permitida para o ultimo preco do feed.
    /// @dev Chamado pelo owner para controlar quando um preco vira stale.
    function setMaxPriceAge(uint256 newMaxPriceAge) external onlyOwner {
        require(newMaxPriceAge > 0, "Invalid max price age");

        uint256 previousMaxPriceAge = maxPriceAge;
        maxPriceAge = newMaxPriceAge;

        emit MaxPriceAgeUpdated(previousMaxPriceAge, newMaxPriceAge);
    }

    /// @notice Retorna o ultimo preco valido de um token.
    /// @dev Usado por getUsdValue, backend/frontend e testes. Reverte se o feed nao existir ou estiver stale.
    function getLatestPrice(address token) public view returns (uint256 price, uint8 decimals, uint256 updatedAt) {
        AggregatorV3Interface feed = priceFeeds[token];
        require(address(feed) != address(0), "Price feed not configured");

        (, int256 answer, , uint256 answerUpdatedAt, ) = feed.latestRoundData();

        require(answer > 0, "Invalid oracle price");
        require(answerUpdatedAt > 0, "Invalid oracle timestamp");
        require(block.timestamp - answerUpdatedAt <= maxPriceAge, "Stale oracle price");

        return (uint256(answer), feed.decimals(), answerUpdatedAt);
    }

    /// @notice Converte uma quantidade de token para valor em USD com escala 1e18.
    /// @dev Usado por backend/frontend e testes. Internamente chama getLatestPrice.
    function getUsdValue(
        address token,
        uint256 amount,
        uint8 tokenDecimals
    ) external view returns (uint256) {
        (uint256 price, uint8 feedDecimals, ) = getLatestPrice(token);

        uint256 amountIn1e18 = _scaleTo1e18(amount, tokenDecimals);
        uint256 priceIn1e18 = _scaleTo1e18(price, feedDecimals);

        return Math.mulDiv(amountIn1e18, priceIn1e18, 1e18);
    }

    /// @notice Ajusta um numero com qualquer quantidade de casas decimais para escala 1e18.
    /// @dev Usado internamente por getUsdValue para normalizar amount e price antes da multiplicacao.
    function _scaleTo1e18(uint256 value, uint8 valueDecimals) private pure returns (uint256) {
        if (valueDecimals == 18) {
            return value;
        }

        if (valueDecimals < 18) {
            return value * (10 ** (18 - valueDecimals));
        }

        return value / (10 ** (valueDecimals - 18));
    }
}
