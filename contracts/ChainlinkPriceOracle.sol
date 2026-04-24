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

    constructor(address initialOwner, uint256 _maxPriceAge) Ownable(initialOwner) {
        require(_maxPriceAge > 0, "Invalid max price age");
        maxPriceAge = _maxPriceAge;
    }

    function setPriceFeed(address token, address feed) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(feed != address(0), "Invalid feed");

        address previousFeed = address(priceFeeds[token]);
        priceFeeds[token] = AggregatorV3Interface(feed);

        emit PriceFeedUpdated(token, previousFeed, feed);
    }

    function setMaxPriceAge(uint256 newMaxPriceAge) external onlyOwner {
        require(newMaxPriceAge > 0, "Invalid max price age");

        uint256 previousMaxPriceAge = maxPriceAge;
        maxPriceAge = newMaxPriceAge;

        emit MaxPriceAgeUpdated(previousMaxPriceAge, newMaxPriceAge);
    }

    function getLatestPrice(address token) public view returns (uint256 price, uint8 decimals, uint256 updatedAt) {
        AggregatorV3Interface feed = priceFeeds[token];
        require(address(feed) != address(0), "Price feed not configured");

        (, int256 answer, , uint256 answerUpdatedAt, ) = feed.latestRoundData();

        require(answer > 0, "Invalid oracle price");
        require(answerUpdatedAt > 0, "Invalid oracle timestamp");
        require(block.timestamp - answerUpdatedAt <= maxPriceAge, "Stale oracle price");

        return (uint256(answer), feed.decimals(), answerUpdatedAt);
    }

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
