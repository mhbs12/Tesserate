// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStakingVotingPower {
    /// @notice Retorna quanto uma conta tem travado em staking.
    /// @dev Exposto pelo staking, mas a TgtDao usa votingPower para aplicar maturidade.
    function stakedBalance(address account) external view returns (uint256);

    /// @notice Retorna quanto do stake ja esta ativo para voto.
    /// @dev So conta saldo que ficou o delay configurado em stake e foi ativado no TGTStaking.
    function votingPower(address account) external view returns (uint256);

    /// @notice Retorna quando o poder de voto foi ativado pela ultima vez.
    /// @dev Usado para impedir ativacao depois do inicio da proposta.
    function votingPowerActivatedAt(address account) external view returns (uint256);

    /// @notice Retorna a base de quorum da DAO.
    /// @dev No TGTStaking atual, usa totalActiveVotingPower para evitar loops nao limitados.
    function totalVotingPower() external view returns (uint256);
}

contract TgtDao is Ownable, ReentrancyGuard {
    enum ProposalState {
        Pending,
        Active,
        Defeated,
        Succeeded,
        Executed,
        Canceled
    }

    struct Proposal {
        uint256 id;
        address proposer;
        address target;
        uint256 value;
        bytes data;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 quorumSnapshot;
        bool executed;
        bool canceled;
    }

    uint256 public constant BPS_DENOMINATOR = 10_000;

    IStakingVotingPower public immutable staking;
    uint256 public proposalCount;
    uint256 public votingDelay;
    uint256 public votingPeriod;
    uint256 public proposalThreshold;
    uint256 public quorumBps;

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed target,
        uint256 value,
        uint256 startTime,
        uint256 endTime,
        uint256 quorumSnapshot,
        string description
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event ProposalCanceled(uint256 indexed proposalId, address indexed caller);
    event VotingDelayUpdated(uint256 previousDelay, uint256 newDelay);
    event VotingPeriodUpdated(uint256 previousPeriod, uint256 newPeriod);
    event ProposalThresholdUpdated(uint256 previousThreshold, uint256 newThreshold);
    event QuorumBpsUpdated(uint256 previousQuorumBps, uint256 newQuorumBps);

    /// @notice Cria a DAO ligada ao contrato de staking.
    /// @dev Usado no deploy. A DAO usa o staking para calcular permissao de proposta, votos e quorum.
    constructor(
        address _stakingAddress,
        address initialOwner,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumBps
    ) Ownable(initialOwner) {
        require(_stakingAddress != address(0), "Invalid staking address");
        require(_votingPeriod > 0, "Invalid voting period");
        require(_quorumBps <= BPS_DENOMINATOR, "Invalid quorum bps");

        staking = IStakingVotingPower(_stakingAddress);
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
        quorumBps = _quorumBps;
    }

    /// @notice Altera o atraso entre criar uma proposta e ela ficar ativa.
    /// @dev Chamado pelo owner para ajustar a regra de governanca.
    function setVotingDelay(uint256 newVotingDelay) external onlyOwner {
        uint256 previousDelay = votingDelay;
        votingDelay = newVotingDelay;
        emit VotingDelayUpdated(previousDelay, newVotingDelay);
    }

    /// @notice Altera por quanto tempo uma proposta fica aberta para voto.
    /// @dev Chamado pelo owner para ajustar a regra de governanca.
    function setVotingPeriod(uint256 newVotingPeriod) external onlyOwner {
        require(newVotingPeriod > 0, "Invalid voting period");
        uint256 previousPeriod = votingPeriod;
        votingPeriod = newVotingPeriod;
        emit VotingPeriodUpdated(previousPeriod, newVotingPeriod);
    }

    /// @notice Altera o minimo de stake necessario para criar proposta.
    /// @dev Chamado pelo owner. propose usa esse valor contra staking.votingPower(msg.sender).
    function setProposalThreshold(uint256 newProposalThreshold) external onlyOwner {
        uint256 previousThreshold = proposalThreshold;
        proposalThreshold = newProposalThreshold;
        emit ProposalThresholdUpdated(previousThreshold, newProposalThreshold);
    }

    /// @notice Altera o quorum minimo em basis points.
    /// @dev Chamado pelo owner. quorumReached usa esse valor sobre a base de quorum salva no snapshot.
    function setQuorumBps(uint256 newQuorumBps) external onlyOwner {
        require(newQuorumBps <= BPS_DENOMINATOR, "Invalid quorum bps");
        uint256 previousQuorumBps = quorumBps;
        quorumBps = newQuorumBps;
        emit QuorumBpsUpdated(previousQuorumBps, newQuorumBps);
    }

    /// @notice Cria uma proposta para chamar outro contrato se a votacao passar.
    /// @dev Chamado por quem tem stake suficiente. Nos testes chama MockGovernanceTarget.setStoredValue.
    function propose(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external returns (uint256) {
        require(target != address(0), "Invalid target");
        require(staking.votingPower(msg.sender) >= proposalThreshold, "Insufficient mature voting power to propose");

        uint256 proposalId = ++proposalCount;
        Proposal storage proposal = _proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.target = target;
        proposal.value = value;
        proposal.data = data;
        proposal.description = description;
        proposal.startTime = block.timestamp + votingDelay;
        proposal.endTime = proposal.startTime + votingPeriod;
        proposal.quorumSnapshot = staking.totalVotingPower();

        _emitProposalCreated(proposalId);

        return proposalId;
    }

    /// @notice Emite o evento de proposta criada.
    /// @dev Funcao interna usada apenas por propose para manter o corpo da funcao menor.
    function _emitProposalCreated(uint256 proposalId) internal {
        Proposal storage proposal = _proposals[proposalId];
        emit ProposalCreated(
            proposalId,
            proposal.proposer,
            proposal.target,
            proposal.value,
            proposal.startTime,
            proposal.endTime,
            proposal.quorumSnapshot,
            proposal.description
        );
    }

    /// @notice Vota a favor ou contra uma proposta ativa.
    /// @dev Chamado por usuarios com TGT maduro e ativado antes do inicio da proposta.
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(state(proposalId) == ProposalState.Active, "Proposal is not active");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 votingPowerActivatedAt = staking.votingPowerActivatedAt(msg.sender);
        require(
            votingPowerActivatedAt != 0 && votingPowerActivatedAt <= proposal.startTime,
            "Voting power was not active at proposal start"
        );

        uint256 weight = staking.votingPower(msg.sender);
        require(weight > 0, "No mature voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /// @notice Executa a chamada configurada na proposta aprovada.
    /// @dev Chamado depois do fim da votacao, apenas se state(proposalId) for Succeeded.
    function execute(uint256 proposalId) external nonReentrant returns (bytes memory) {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(state(proposalId) == ProposalState.Succeeded, "Proposal not successful");

        proposal.executed = true;

        (bool success, bytes memory returndata) = proposal.target.call{value: proposal.value}(proposal.data);
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId, msg.sender);
        return returndata;
    }

    /// @notice Cancela uma proposta ainda nao executada.
    /// @dev Chamado pelo proposer ou pelo owner quando a proposta nao deve seguir.
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(!proposal.executed, "Proposal already executed");
        require(msg.sender == proposal.proposer || msg.sender == owner(), "Not authorized");

        proposal.canceled = true;
        emit ProposalCanceled(proposalId, msg.sender);
    }

    /// @notice Diz se uma proposta atingiu o quorum minimo.
    /// @dev Usado por state para decidir se a proposta foi derrotada por falta de votos.
    function quorumReached(uint256 proposalId) public view returns (bool) {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) {
            return false;
        }

        uint256 requiredVotes = (proposal.quorumSnapshot * quorumBps) / BPS_DENOMINATOR;
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        return totalVotes >= requiredVotes;
    }

    /// @notice Retorna o estado atual de uma proposta.
    /// @dev Usado por vote, execute, frontends e testes para saber se a proposta esta ativa/aprovada/etc.
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        if (block.timestamp < proposal.startTime) {
            return ProposalState.Pending;
        }
        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }
        if (!quorumReached(proposalId)) {
            return ProposalState.Defeated;
        }
        if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalState.Defeated;
        }

        return ProposalState.Succeeded;
    }

    /// @notice Retorna os dados numericos principais de uma proposta.
    /// @dev Funcao read-only para frontend/backend sem retornar bytes/string grandes.
    function getProposalSummary(
        uint256 proposalId
    )
        external
        view
        returns (
            address proposer,
            address target,
            uint256 value,
            uint256 startTime,
            uint256 endTime,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 quorumSnapshot,
            bool executed,
            bool canceled
        )
    {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");

        return (
            proposal.proposer,
            proposal.target,
            proposal.value,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.quorumSnapshot,
            proposal.executed,
            proposal.canceled
        );
    }

    /// @notice Retorna o payload executavel e a descricao da proposta.
    /// @dev Funcao read-only usada por frontend/backend para mostrar ou inspecionar a chamada proposta.
    function getProposalPayload(
        uint256 proposalId
    ) external view returns (bytes memory data, string memory description) {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        return (proposal.data, proposal.description);
    }

    /// @notice Permite que a DAO receba ETH para executar propostas com value.
    /// @dev Usado se alguma proposta futura precisar enviar ETH junto da chamada.
    receive() external payable {}
}
