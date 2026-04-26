// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract TGTStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant REWARD_PRECISION = 1e18;
    uint256 public constant VOTING_POWER_DELAY = 30 days;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;
    uint256 public totalStaked;
    uint256 public totalActiveVotingPower;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public activeVotingPower;
    mapping(address => uint256) public votingPowerActivatedAt;
    mapping(address => uint256) public stakeStartedAt;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => bool) private _hasStaked;
    address[] private _stakers;

    event Staked(address indexed user, uint256 amount, uint256 newUserBalance, uint256 newTotalStaked);
    event Unstaked(address indexed user, uint256 amount, uint256 newUserBalance, uint256 newTotalStaked);
    event RewardsFunded(
        address indexed funder,
        uint256 amount,
        uint256 rewardPerTokenIncrease,
        uint256 newRewardPerToken
    );
    event RewardPaid(address indexed user, uint256 amount);
    event VotingPowerActivated(address indexed user, uint256 votingPower, uint256 totalActiveVotingPower);

    /// @notice Configura qual ERC20 sera travado em staking e qual ERC20 sera pago como recompensa.
    /// @dev Usado no deploy com TGT como stakingToken e USDC como rewardToken.
    constructor(address _stakingToken, address _rewardToken, address initialOwner) Ownable(initialOwner) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    /// @notice Trava TGT no contrato de staking.
    /// @dev Chamado por usuarios que querem poder de voto na TgtDao. Cada novo stake reinicia os 30 dias e limpa o voto ativo.
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        _updateReward(msg.sender);

        if (!_hasStaked[msg.sender]) {
            _hasStaked[msg.sender] = true;
            _stakers.push(msg.sender);
        }

        _clearActiveVotingPower(msg.sender);
        stakedBalance[msg.sender] += amount;
        stakeStartedAt[msg.sender] = block.timestamp;
        totalStaked += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, stakedBalance[msg.sender], totalStaked);
    }

    /// @notice Retira TGT que o usuario tinha travado.
    /// @dev Chamado pelo proprio usuario. Unstake parcial tambem reinicia os 30 dias e limpa o voto ativo do saldo restante.
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");

        _updateReward(msg.sender);

        _clearActiveVotingPower(msg.sender);
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        if (stakedBalance[msg.sender] == 0) {
            stakeStartedAt[msg.sender] = 0;
        } else {
            stakeStartedAt[msg.sender] = block.timestamp;
        }
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, stakedBalance[msg.sender], totalStaked);
    }

    /// @notice Ativa o poder de voto depois de 30 dias seguidos de stake.
    /// @dev Mantem totalVotingPower O(1), sem loop por todos os stakers.
    function activateVotingPower() external {
        require(stakedBalance[msg.sender] > 0, "No staked tokens");
        require(hasMaturedStake(msg.sender), "Stake is not mature yet");

        uint256 previousVotingPower = activeVotingPower[msg.sender];
        uint256 newVotingPower = stakedBalance[msg.sender];

        if (newVotingPower > previousVotingPower) {
            totalActiveVotingPower += newVotingPower - previousVotingPower;
        } else if (previousVotingPower > newVotingPower) {
            totalActiveVotingPower -= previousVotingPower - newVotingPower;
        }

        activeVotingPower[msg.sender] = newVotingPower;
        votingPowerActivatedAt[msg.sender] = block.timestamp;

        emit VotingPowerActivated(msg.sender, newVotingPower, totalActiveVotingPower);
    }

    /// @notice Financia recompensas em USDC para stakers atuais.
    /// @dev Pode ser chamado pelo EscrowVault ou por uma tesouraria apos approve do rewardToken.
    function fundRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(totalStaked > 0, "No staked tokens");

        uint256 rewardPerTokenIncrease = Math.mulDiv(amount, REWARD_PRECISION, totalStaked);
        require(rewardPerTokenIncrease > 0, "Reward amount too small");

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        _distributeRewards(msg.sender, amount, rewardPerTokenIncrease);
    }

    /// @notice Recebe recompensas em USDC vindas automaticamente do EscrowVault.
    /// @dev O chamador precisa aprovar este contrato antes. Mantido separado para clareza de integracao.
    function notifyRewardAmount(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(totalStaked > 0, "No staked tokens");

        uint256 rewardPerTokenIncrease = Math.mulDiv(amount, REWARD_PRECISION, totalStaked);
        require(rewardPerTokenIncrease > 0, "Reward amount too small");

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        _distributeRewards(msg.sender, amount, rewardPerTokenIncrease);
    }

    /// @notice Saca recompensas de staking acumuladas em USDC.
    /// @dev O principal continua em TGT; somente o reward e pago em USDC.
    function claimRewards() external nonReentrant {
        _updateReward(msg.sender);

        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards available");

        rewards[msg.sender] = 0;
        rewardToken.safeTransfer(msg.sender, reward);

        emit RewardPaid(msg.sender, reward);
    }

    /// @notice Retorna quanto USDC uma conta pode sacar de recompensa.
    /// @dev Inclui recompensas ja salvas e a parcela pendente desde a ultima atualizacao da conta.
    function earned(address account) public view returns (uint256) {
        uint256 rewardDelta = rewardPerTokenStored - userRewardPerTokenPaid[account];
        return rewards[account] + Math.mulDiv(stakedBalance[account], rewardDelta, REWARD_PRECISION);
    }

    /// @notice Retorna USDC disponivel no contrato para recompensas ja notificadas e ainda nao sacadas.
    /// @dev Ajuda frontends e relatorios a mostrar a reserva de recompensas ainda nao sacada.
    function rewardReserve() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    function _updateReward(address account) private {
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    function _clearActiveVotingPower(address account) private {
        uint256 previousVotingPower = activeVotingPower[account];
        if (previousVotingPower == 0) {
            return;
        }

        activeVotingPower[account] = 0;
        votingPowerActivatedAt[account] = 0;
        totalActiveVotingPower -= previousVotingPower;
    }

    function _distributeRewards(address funder, uint256 amount, uint256 rewardPerTokenIncrease) private {
        rewardPerTokenStored += rewardPerTokenIncrease;

        emit RewardsFunded(funder, amount, rewardPerTokenIncrease, rewardPerTokenStored);
    }

    /// @notice Retorna o poder de voto de uma conta.
    /// @dev A TgtDao usa esta funcao. O saldo so conta depois de 30 dias seguidos e activateVotingPower.
    function votingPower(address account) public view returns (uint256) {
        return activeVotingPower[account];
    }

    /// @notice Retorna o total usado pela TgtDao como base de quorum.
    /// @dev Usa totalStaked para evitar loops nao limitados ao criar propostas.
    function totalVotingPower() external view returns (uint256) {
        return totalActiveVotingPower;
    }

    /// @notice Retorna quantas carteiras ja fizeram stake pelo menos uma vez.
    /// @dev Funcao auxiliar para frontends e auditoria simples do totalVotingPower.
    function stakerCount() external view returns (uint256) {
        return _stakers.length;
    }

    /// @notice Retorna quando o stake da conta passa a contar para voto.
    /// @dev Frontends podem usar para exibir o tempo restante ate o poder de voto liberar.
    function votingPowerUnlockTime(address account) external view returns (uint256) {
        if (stakeStartedAt[account] == 0) {
            return 0;
        }

        return stakeStartedAt[account] + VOTING_POWER_DELAY;
    }

    /// @notice Diz se a conta ja completou 30 dias seguidos de stake.
    /// @dev Usado por votingPower para aplicar a regra anti-transferencia entre carteiras.
    function hasMaturedStake(address account) public view returns (bool) {
        uint256 startedAt = stakeStartedAt[account];
        return startedAt != 0 && block.timestamp >= startedAt + VOTING_POWER_DELAY;
    }
}
