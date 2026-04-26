// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TestTgtFaucet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public claimAmount;
    uint256 public cooldown;

    mapping(address => uint256) public lastClaimedAt;

    event Claimed(address indexed account, uint256 amount);
    event ClaimAmountUpdated(uint256 previousAmount, uint256 newAmount);
    event CooldownUpdated(uint256 previousCooldown, uint256 newCooldown);
    event TokensWithdrawn(address indexed to, uint256 amount);

    constructor(
        address tokenAddress,
        address initialOwner,
        uint256 initialClaimAmount,
        uint256 initialCooldown
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "Invalid token");
        require(initialOwner != address(0), "Invalid owner");
        require(initialClaimAmount > 0, "Invalid claim amount");

        token = IERC20(tokenAddress);
        claimAmount = initialClaimAmount;
        cooldown = initialCooldown;
    }

    function claim() external nonReentrant {
        uint256 nextClaimAt = lastClaimedAt[msg.sender] + cooldown;
        require(block.timestamp >= nextClaimAt, "Cooldown active");
        require(token.balanceOf(address(this)) >= claimAmount, "Faucet empty");

        lastClaimedAt[msg.sender] = block.timestamp;
        token.safeTransfer(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount);
    }

    function setClaimAmount(uint256 newClaimAmount) external onlyOwner {
        require(newClaimAmount > 0, "Invalid claim amount");

        uint256 previousAmount = claimAmount;
        claimAmount = newClaimAmount;

        emit ClaimAmountUpdated(previousAmount, newClaimAmount);
    }

    function setCooldown(uint256 newCooldown) external onlyOwner {
        uint256 previousCooldown = cooldown;
        cooldown = newCooldown;

        emit CooldownUpdated(previousCooldown, newCooldown);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        token.safeTransfer(to, amount);

        emit TokensWithdrawn(to, amount);
    }
}
