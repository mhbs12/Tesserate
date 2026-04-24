// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface IGuaranteeNFT {
    function mintGuarantee(address employee) external returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function markAsPaid(uint256 tokenId) external;
}

interface IYieldRightNFT {
    function mintYieldRight(address employer) external returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IGovernanceToken {
    function balanceOf(address account) external view returns (uint256);
}

interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveNormalizedIncome(address asset) external view returns (uint256);
}

contract EscrowVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DEFAULT_PLATFORM_FEE_BPS = 1_000; // 10%
    uint256 public constant FEE_1000_TOKENS_BPS = 900; // 9%
    uint256 public constant FEE_2000_TOKENS_BPS = 800; // 8%
    uint256 public constant FEE_4000_TOKENS_BPS = 700; // 7%
    uint256 public constant FEE_10000_TOKENS_BPS = 500; // 5%

    uint256 public constant THRESHOLD_1000_TOKENS = 1_000 * 10 ** 18;
    uint256 public constant THRESHOLD_2000_TOKENS = 2_000 * 10 ** 18;
    uint256 public constant THRESHOLD_4000_TOKENS = 4_000 * 10 ** 18;
    uint256 public constant THRESHOLD_10000_TOKENS = 10_000 * 10 ** 18;

    struct Service {
        address employer;
        address employee;
        address paymentToken;
        uint256 amountLocked;
        uint256 startTime;
        uint256 lockDuration;
        uint256 yieldRightTokenId;
        uint256 startIncomeIndex;
        uint256 claimedYield;
        bool principalReleased;
    }

    mapping(uint256 => Service) public services;
    mapping(uint256 => uint256) public yieldRightToGuaranteeToken;

    IGuaranteeNFT public nftContract;
    IYieldRightNFT public yieldRightNftContract;
    IGovernanceToken public governanceToken;
    IPool public aavePool;
    address public platformFeeRecipient;
    AggregatorV3Interface internal priceFeed;

    event GovernanceTokenUpdated(address indexed previousToken, address indexed newToken);
    event PlatformFeeRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
    event ServiceCreated(
        uint256 indexed guaranteeTokenId,
        uint256 indexed yieldRightTokenId,
        address indexed employer,
        address employee,
        address paymentToken,
        uint256 amountLocked,
        uint256 lockDuration,
        uint256 startIncomeIndex
    );
    event PaymentReleased(
        uint256 indexed guaranteeTokenId,
        address indexed employee,
        address paymentToken,
        uint256 amountPaid
    );
    event YieldClaimed(
        uint256 indexed guaranteeTokenId,
        uint256 indexed yieldRightTokenId,
        address indexed claimant,
        address paymentToken,
        uint256 grossAmountClaimed,
        uint256 appliedFeeBps,
        uint256 platformFeeAmount,
        uint256 netAmountClaimed,
        uint256 totalClaimedGross
    );

    constructor(
        address _nftAddress,
        address _yieldRightNftAddress,
        address _priceFeedAddress,
        address _aavePoolAddress
    ) Ownable(msg.sender) {
        require(_nftAddress != address(0), "Invalid NFT address");
        require(_yieldRightNftAddress != address(0), "Invalid yield NFT address");
        require(_priceFeedAddress != address(0), "Invalid price feed address");
        require(_aavePoolAddress != address(0), "Invalid Aave pool address");

        nftContract = IGuaranteeNFT(_nftAddress);
        yieldRightNftContract = IYieldRightNFT(_yieldRightNftAddress);
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        aavePool = IPool(_aavePoolAddress);
        platformFeeRecipient = msg.sender;
    }

    function setGovernanceToken(address _governanceTokenAddress) external onlyOwner {
        require(_governanceTokenAddress != address(0), "Invalid governance token address");

        address previousToken = address(governanceToken);
        governanceToken = IGovernanceToken(_governanceTokenAddress);

        emit GovernanceTokenUpdated(previousToken, _governanceTokenAddress);
    }

    function setPlatformFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid platform fee recipient");

        address previousRecipient = platformFeeRecipient;
        platformFeeRecipient = _newRecipient;

        emit PlatformFeeRecipientUpdated(previousRecipient, _newRecipient);
    }

    function getFeeBpsFor(address account) public view returns (uint256) {
        return _getPlatformFeeBps(account);
    }

    function getClaimableYieldGross(uint256 _yieldRightTokenId) external view returns (uint256) {
        uint256 guaranteeTokenId = yieldRightToGuaranteeToken[_yieldRightTokenId];
        Service storage service = services[guaranteeTokenId];

        if (service.employer == address(0)) {
            return 0;
        }
        if (block.timestamp < service.startTime + service.lockDuration) {
            return 0;
        }

        return _getClaimableYieldGross(service);
    }

    function deposit(
        address _employee,
        address _paymentToken,
        uint256 _amount,
        uint256 _durationInDays
    ) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_employee != address(0), "Invalid employee address");
        require(_paymentToken != address(0), "Invalid payment token address");
        require(_durationInDays > 0, "Duration must be greater than 0");
        require(address(governanceToken) != address(0), "Governance token not configured");

        IERC20 paymentToken = IERC20(_paymentToken);

        paymentToken.safeTransferFrom(msg.sender, address(this), _amount);
        paymentToken.forceApprove(address(aavePool), _amount);

        aavePool.supply(_paymentToken, _amount, address(this), 0);

        uint256 guaranteeTokenId = nftContract.mintGuarantee(_employee);
        uint256 yieldRightTokenId = yieldRightNftContract.mintYieldRight(msg.sender);
        uint256 lockDuration = _durationInDays * 1 days;
        uint256 startIncomeIndex = aavePool.getReserveNormalizedIncome(_paymentToken);

        require(startIncomeIndex > 0, "Invalid income index");

        services[guaranteeTokenId] = Service({
            employer: msg.sender,
            employee: _employee,
            paymentToken: _paymentToken,
            amountLocked: _amount,
            startTime: block.timestamp,
            lockDuration: lockDuration,
            yieldRightTokenId: yieldRightTokenId,
            startIncomeIndex: startIncomeIndex,
            claimedYield: 0,
            principalReleased: false
        });

        yieldRightToGuaranteeToken[yieldRightTokenId] = guaranteeTokenId;

        emit ServiceCreated(
            guaranteeTokenId,
            yieldRightTokenId,
            msg.sender,
            _employee,
            _paymentToken,
            _amount,
            lockDuration,
            startIncomeIndex
        );
    }

    function releasePayment(uint256 _guaranteeTokenId) external nonReentrant {
        Service storage service = services[_guaranteeTokenId];

        require(service.employer != address(0), "Service not found");
        require(!service.principalReleased, "Payment already released");
        require(block.timestamp >= service.startTime + service.lockDuration, "Time lock not expired");

        address currentOwner = nftContract.ownerOf(_guaranteeTokenId);
        require(msg.sender == currentOwner, "Only the NFT owner can claim payment");

        service.principalReleased = true;

        uint256 withdrawnAmount = aavePool.withdraw(service.paymentToken, service.amountLocked, address(this));
        require(withdrawnAmount >= service.amountLocked, "Insufficient amount withdrawn");

        IERC20(service.paymentToken).safeTransfer(currentOwner, service.amountLocked);

        nftContract.markAsPaid(_guaranteeTokenId);

        emit PaymentReleased(_guaranteeTokenId, currentOwner, service.paymentToken, service.amountLocked);
    }

    function claimYield(uint256 _yieldRightTokenId) external nonReentrant {
        uint256 guaranteeTokenId = yieldRightToGuaranteeToken[_yieldRightTokenId];
        Service storage service = services[guaranteeTokenId];

        require(service.employer != address(0), "Service not found");
        require(service.yieldRightTokenId == _yieldRightTokenId, "Invalid yield right token");
        require(block.timestamp >= service.startTime + service.lockDuration, "Time lock not expired");
        require(msg.sender == yieldRightNftContract.ownerOf(_yieldRightTokenId), "Only the yield NFT owner can claim");

        uint256 claimableYieldGross = _getClaimableYieldGross(service);
        require(claimableYieldGross > 0, "No yield available");
        service.claimedYield += claimableYieldGross;

        require(
            aavePool.withdraw(service.paymentToken, claimableYieldGross, address(this)) >= claimableYieldGross,
            "Insufficient yield withdrawn"
        );

        uint256 appliedFeeBps = _getPlatformFeeBps(msg.sender);
        uint256 platformFeeAmount = Math.mulDiv(claimableYieldGross, appliedFeeBps, BPS_DENOMINATOR);
        uint256 netAmountClaimed = claimableYieldGross - platformFeeAmount;

        IERC20(service.paymentToken).safeTransfer(msg.sender, netAmountClaimed);
        if (platformFeeAmount > 0) {
            IERC20(service.paymentToken).safeTransfer(platformFeeRecipient, platformFeeAmount);
        }

        emit YieldClaimed(
            guaranteeTokenId,
            _yieldRightTokenId,
            msg.sender,
            service.paymentToken,
            claimableYieldGross,
            appliedFeeBps,
            platformFeeAmount,
            netAmountClaimed,
            service.claimedYield
        );
    }

    function getClaimableYield(uint256 _yieldRightTokenId) external view returns (uint256) {
        uint256 guaranteeTokenId = yieldRightToGuaranteeToken[_yieldRightTokenId];
        Service storage service = services[guaranteeTokenId];

        if (service.employer == address(0)) {
            return 0;
        }
        if (block.timestamp < service.startTime + service.lockDuration) {
            return 0;
        }

        uint256 claimableYieldGross = _getClaimableYieldGross(service);
        address currentOwner = yieldRightNftContract.ownerOf(_yieldRightTokenId);
        uint256 appliedFeeBps = _getPlatformFeeBps(currentOwner);
        uint256 platformFeeAmount = Math.mulDiv(claimableYieldGross, appliedFeeBps, BPS_DENOMINATOR);
        return claimableYieldGross - platformFeeAmount;
    }

    function _getClaimableYieldGross(Service storage service) private view returns (uint256) {
        uint256 currentIncomeIndex = aavePool.getReserveNormalizedIncome(service.paymentToken);
        if (currentIncomeIndex <= service.startIncomeIndex) {
            return 0;
        }

        uint256 grossUnderlying = Math.mulDiv(
            service.amountLocked,
            currentIncomeIndex,
            service.startIncomeIndex
        );
        if (grossUnderlying <= service.amountLocked) {
            return 0;
        }

        uint256 accruedYield = grossUnderlying - service.amountLocked;
        if (accruedYield <= service.claimedYield) {
            return 0;
        }

        return accruedYield - service.claimedYield;
    }

    function _getPlatformFeeBps(address account) private view returns (uint256) {
        uint256 balance = governanceToken.balanceOf(account);

        if (balance >= THRESHOLD_10000_TOKENS) {
            return FEE_10000_TOKENS_BPS;
        }
        if (balance >= THRESHOLD_4000_TOKENS) {
            return FEE_4000_TOKENS_BPS;
        }
        if (balance >= THRESHOLD_2000_TOKENS) {
            return FEE_2000_TOKENS_BPS;
        }
        if (balance >= THRESHOLD_1000_TOKENS) {
            return FEE_1000_TOKENS_BPS;
        }

        return DEFAULT_PLATFORM_FEE_BPS;
    }
}
