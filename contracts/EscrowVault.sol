// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IGuaranteeNFT {
    /// @notice Cria o NFT que da ao funcionario o direito de sacar o principal.
    /// @dev Chamado somente por EscrowVault.deposit.
    function mintGuarantee(address employee) external returns (uint256);

    /// @notice Retorna o dono atual de um GuaranteeNFT.
    /// @dev Usado por EscrowVault.releasePayment para validar quem pode sacar o principal.
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Marca o GuaranteeNFT como pago.
    /// @dev Chamado por EscrowVault.releasePayment depois que o principal e transferido.
    function markAsPaid(uint256 tokenId) external;
}

interface IYieldRightNFT {
    /// @notice Cria o NFT que da ao empregador o direito de sacar o rendimento.
    /// @dev Chamado somente por EscrowVault.deposit.
    function mintYieldRight(address employer) external returns (uint256);

    /// @notice Retorna o dono atual de um YieldRightNFT.
    /// @dev Usado por EscrowVault.claimYield e getClaimableYield para validar/calcular o claim.
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IGovernanceToken {
    /// @notice Retorna o saldo de TGT de uma conta.
    /// @dev Usado pelo EscrowVault para calcular a taxa de plataforma do claim de yield.
    function balanceOf(address account) external view returns (uint256);
}

interface IPool {
    /// @notice Deposita o token de pagamento no pool de rendimento.
    /// @dev Chamado por EscrowVault.deposit depois do transferFrom.
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;

    /// @notice Retira principal ou rendimento do pool.
    /// @dev Chamado por EscrowVault.releasePayment e EscrowVault.claimYield.
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);

    /// @notice Retorna o indice de rendimento acumulado do ativo.
    /// @dev Usado no deposito e no calculo do yield acumulado.
    function getReserveNormalizedIncome(address asset) external view returns (uint256);
}

interface IPriceOracle {
    /// @notice Converte uma quantidade de token para USD em escala 1e18.
    /// @dev Implementado por ChainlinkPriceOracle e usado pelo EscrowVault.deposit.
    function getUsdValue(address token, uint256 amount, uint8 tokenDecimals) external view returns (uint256);
}

interface IStakingRewards {
    /// @notice Notifica e transfere recompensas em USDC para stakers de TGT.
    /// @dev O EscrowVault aprova USDC e chama esta funcao com 50% da taxa cobrada.
    function notifyRewardAmount(uint256 amount) external;

    /// @notice Retorna quanto TGT uma conta tem em stake.
    /// @dev Usado para calcular desconto de taxa sem punir quem trava TGT no staking.
    function stakedBalance(address account) external view returns (uint256);

    /// @notice Retorna o total de TGT em stake.
    /// @dev Usado para evitar enviar recompensa quando ainda nao ha stakers.
    function totalStaked() external view returns (uint256);
}

contract EscrowVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_DEPOSIT_USD_VALUE = 1e18; // 1 USD
    uint256 public constant STAKING_REWARDS_FEE_SHARE_BPS = 5_000; // 50%
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
    IPriceOracle public priceOracle;
    IERC20Metadata public immutable usdcToken;
    IStakingRewards public stakingRewardsContract;
    address public platformFeeRecipient;

    event GovernanceTokenUpdated(address indexed previousToken, address indexed newToken);
    event PlatformFeeRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
    event StakingRewardsContractUpdated(address indexed previousContract, address indexed newContract);
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
        uint256 stakingRewardsAmount,
        uint256 netAmountClaimed,
        uint256 totalClaimedGross
    );

    /// @notice Configura os contratos externos que o cofre usa.
    /// @dev Usado no deploy pelo modulo Ignition e pelos testes. O token de pagamento padrao e USDC.
    constructor(
        address _nftAddress,
        address _yieldRightNftAddress,
        address _priceOracleAddress,
        address _aavePoolAddress,
        address _usdcTokenAddress,
        address _stakingRewardsContract
    ) Ownable(msg.sender) {
        require(_nftAddress != address(0), "Invalid NFT address");
        require(_yieldRightNftAddress != address(0), "Invalid yield NFT address");
        require(_priceOracleAddress != address(0), "Invalid price oracle address");
        require(_aavePoolAddress != address(0), "Invalid Aave pool address");
        require(_usdcTokenAddress != address(0), "Invalid USDC token address");
        require(_stakingRewardsContract != address(0), "Invalid staking rewards contract");
        require(_stakingRewardsContract.code.length > 0, "Invalid staking rewards contract");

        nftContract = IGuaranteeNFT(_nftAddress);
        yieldRightNftContract = IYieldRightNFT(_yieldRightNftAddress);
        priceOracle = IPriceOracle(_priceOracleAddress);
        aavePool = IPool(_aavePoolAddress);
        usdcToken = IERC20Metadata(_usdcTokenAddress);
        stakingRewardsContract = IStakingRewards(_stakingRewardsContract);
        platformFeeRecipient = msg.sender;
    }

    /// @notice Define qual token TGT sera usado para calcular descontos de taxa.
    /// @dev Chamado pelo owner apos o deploy. O deposit exige que esse token ja esteja configurado.
    function setGovernanceToken(address _governanceTokenAddress) external onlyOwner {
        require(_governanceTokenAddress != address(0), "Invalid governance token address");

        address previousToken = address(governanceToken);
        governanceToken = IGovernanceToken(_governanceTokenAddress);

        emit GovernanceTokenUpdated(previousToken, _governanceTokenAddress);
    }

    /// @notice Define quem recebe a taxa cobrada sobre o rendimento.
    /// @dev Chamado pelo owner quando a plataforma quer trocar a carteira recebedora das taxas.
    function setPlatformFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid platform fee recipient");

        address previousRecipient = platformFeeRecipient;
        platformFeeRecipient = _newRecipient;

        emit PlatformFeeRecipientUpdated(previousRecipient, _newRecipient);
    }

    /// @notice Define o contrato de staking que recebe 50% das taxas em USDC.
    /// @dev Normalmente aponta para o TGTStaking, que distribui USDC proporcionalmente aos stakers.
    function setStakingRewardsContract(address _newContract) external onlyOwner {
        require(_newContract != address(0), "Invalid staking rewards contract");
        require(_newContract.code.length > 0, "Invalid staking rewards contract");

        address previousContract = address(stakingRewardsContract);
        stakingRewardsContract = IStakingRewards(_newContract);

        emit StakingRewardsContractUpdated(previousContract, _newContract);
    }

    /// @notice Mostra a taxa em basis points que uma conta pagaria no claim de yield.
    /// @dev Usado por frontend/backend/testes para exibir o tier de taxa antes do claim.
    function getFeeBpsFor(address account) public view returns (uint256) {
        return _getPlatformFeeBps(account);
    }

    /// @notice Divide a taxa total entre operacao da plataforma e recompensas em USDC para staking.
    /// @dev A parte de recompensas e enviada ao TGTStaking para distribuicao proporcional aos stakers.
    function getFeeSplit(uint256 totalFeeAmount)
        public
        pure
        returns (uint256 platformFeeAmount, uint256 stakingRewardsAmount)
    {
        stakingRewardsAmount = Math.mulDiv(
            totalFeeAmount,
            STAKING_REWARDS_FEE_SHARE_BPS,
            BPS_DENOMINATOR
        );
        platformFeeAmount = totalFeeAmount - stakingRewardsAmount;
    }

    /// @notice Retorna o yield bruto disponivel para um YieldRightNFT, sem descontar taxa.
    /// @dev Funcao read-only para frontend/backend. Usa o mapping yieldRightToGuaranteeToken.
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

    /// @notice Retorna quanto um deposito vale em USD, usando escala 1e18.
    /// @dev Usado pelo frontend/backend para mostrar o valor antes de chamar deposit.
    function getDepositUsdValue(address _paymentToken, uint256 _amount) public view returns (uint256) {
        require(_paymentToken != address(0), "Invalid payment token address");
        require(_paymentToken == address(usdcToken), "Only USDC payments supported");

        uint8 tokenDecimals = IERC20Metadata(_paymentToken).decimals();
        return priceOracle.getUsdValue(_paymentToken, _amount, tokenDecimals);
    }

    /// @notice Cria um escrow: recebe tokens da empresa, deposita na Aave e emite os dois NFTs.
    /// @dev Chamado pela empresa. Exige approve antes e valor de deposito maior que 1 USD pelo oracle.
    function deposit(
        address _employee,
        address _paymentToken,
        uint256 _amount,
        uint256 _durationInDays
    ) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_employee != address(0), "Invalid employee address");
        require(_paymentToken != address(0), "Invalid payment token address");
        require(_paymentToken == address(usdcToken), "Only USDC payments supported");
        require(_durationInDays > 0, "Duration must be greater than 0");
        require(address(governanceToken) != address(0), "Governance token not configured");
        require(
            getDepositUsdValue(_paymentToken, _amount) > MIN_DEPOSIT_USD_VALUE,
            "Deposit must be greater than 1 USD"
        );

        IERC20 paymentToken = IERC20(address(usdcToken));

        paymentToken.safeTransferFrom(msg.sender, address(this), _amount);
        paymentToken.forceApprove(address(aavePool), _amount);

        aavePool.supply(address(usdcToken), _amount, address(this), 0);

        uint256 guaranteeTokenId = nftContract.mintGuarantee(_employee);
        uint256 yieldRightTokenId = yieldRightNftContract.mintYieldRight(msg.sender);
        uint256 lockDuration = _durationInDays * 1 days;
        uint256 startIncomeIndex = aavePool.getReserveNormalizedIncome(address(usdcToken));

        require(startIncomeIndex > 0, "Invalid income index");

        services[guaranteeTokenId] = Service({
            employer: msg.sender,
            employee: _employee,
            paymentToken: address(usdcToken),
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
            address(usdcToken),
            _amount,
            lockDuration,
            startIncomeIndex
        );
    }

    /// @notice Libera o principal para o dono do GuaranteeNFT depois do prazo.
    /// @dev Chamado pelo funcionario ou por quem estiver com o GuaranteeNFT. Marca o NFT como pago.
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

    /// @notice Libera o rendimento para o dono do YieldRightNFT depois do prazo.
    /// @dev Chamado pela empresa ou por quem estiver com o YieldRightNFT. Cobra taxa conforme saldo de TGT.
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
        uint256 totalFeeAmount = Math.mulDiv(claimableYieldGross, appliedFeeBps, BPS_DENOMINATOR);
        (
            uint256 platformFeeAmount,
            uint256 stakingRewardsAmount
        ) = getFeeSplit(totalFeeAmount);
        uint256 netAmountClaimed = claimableYieldGross - totalFeeAmount;

        if (stakingRewardsAmount > 0) {
            if (stakingRewardsContract.totalStaked() == 0) {
                platformFeeAmount += stakingRewardsAmount;
                stakingRewardsAmount = 0;
            } else {
                IERC20(service.paymentToken).forceApprove(address(stakingRewardsContract), stakingRewardsAmount);
                stakingRewardsContract.notifyRewardAmount(stakingRewardsAmount);
            }
        }

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
            stakingRewardsAmount,
            netAmountClaimed,
            service.claimedYield
        );
    }

    /// @notice Retorna o yield liquido disponivel para o dono atual do YieldRightNFT.
    /// @dev Funcao read-only para frontend/backend. Ja desconta a taxa baseada no saldo de TGT do dono do NFT.
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
        uint256 totalFeeAmount = Math.mulDiv(claimableYieldGross, appliedFeeBps, BPS_DENOMINATOR);
        return claimableYieldGross - totalFeeAmount;
    }

    /// @notice Calcula o rendimento bruto acumulado de um Service.
    /// @dev Usado por claimYield, getClaimableYield e getClaimableYieldGross.
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

    /// @notice Calcula a taxa de plataforma conforme o saldo de TGT da conta.
    /// @dev Usado pelo claim de yield e pelas funcoes de consulta de taxa/yield liquido.
    function _getPlatformFeeBps(address account) private view returns (uint256) {
        uint256 balance = governanceToken.balanceOf(account) + stakingRewardsContract.stakedBalance(account);

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
