// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableERC20 is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract MockAavePool {
    uint256 private constant RAY = 1e27;

    mapping(address => uint256) public totalSupplied;
    mapping(address => uint256) public reserveNormalizedIncome;

    function supply(address asset, uint256 amount, address, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        totalSupplied[asset] += amount;

        if (reserveNormalizedIncome[asset] == 0) {
            reserveNormalizedIncome[asset] = RAY;
        }
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        uint256 available = totalSupplied[asset];
        uint256 withdrawn = amount > available ? available : amount;

        totalSupplied[asset] = available - withdrawn;
        IERC20(asset).transfer(to, withdrawn);

        return withdrawn;
    }

    function getReserveNormalizedIncome(address asset) external view returns (uint256) {
        uint256 currentIncome = reserveNormalizedIncome[asset];
        return currentIncome == 0 ? RAY : currentIncome;
    }

    function setReserveNormalizedIncome(address asset, uint256 newIncome) external {
        uint256 currentIncome = reserveNormalizedIncome[asset];
        if (currentIncome == 0) {
            currentIncome = RAY;
        }

        require(newIncome >= currentIncome, "Income index cannot decrease");
        reserveNormalizedIncome[asset] = newIncome;
    }

    function accrueYield(address asset, uint256 amount) external {
        IMintableERC20(asset).mint(address(this), amount);
        totalSupplied[asset] += amount;
    }
}
