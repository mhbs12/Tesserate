// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStakingVotingPower {
    function stakedBalance(address account) external view returns (uint256);
    function totalStaked() external view returns (uint256);
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

    function setVotingDelay(uint256 newVotingDelay) external onlyOwner {
        uint256 previousDelay = votingDelay;
        votingDelay = newVotingDelay;
        emit VotingDelayUpdated(previousDelay, newVotingDelay);
    }

    function setVotingPeriod(uint256 newVotingPeriod) external onlyOwner {
        require(newVotingPeriod > 0, "Invalid voting period");
        uint256 previousPeriod = votingPeriod;
        votingPeriod = newVotingPeriod;
        emit VotingPeriodUpdated(previousPeriod, newVotingPeriod);
    }

    function setProposalThreshold(uint256 newProposalThreshold) external onlyOwner {
        uint256 previousThreshold = proposalThreshold;
        proposalThreshold = newProposalThreshold;
        emit ProposalThresholdUpdated(previousThreshold, newProposalThreshold);
    }

    function setQuorumBps(uint256 newQuorumBps) external onlyOwner {
        require(newQuorumBps <= BPS_DENOMINATOR, "Invalid quorum bps");
        uint256 previousQuorumBps = quorumBps;
        quorumBps = newQuorumBps;
        emit QuorumBpsUpdated(previousQuorumBps, newQuorumBps);
    }

    function propose(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external returns (uint256) {
        require(target != address(0), "Invalid target");
        require(staking.stakedBalance(msg.sender) >= proposalThreshold, "Insufficient voting power to propose");

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
        proposal.quorumSnapshot = staking.totalStaked();

        _emitProposalCreated(proposalId);

        return proposalId;
    }

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

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(state(proposalId) == ProposalState.Active, "Proposal is not active");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 weight = staking.stakedBalance(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

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

    function cancel(uint256 proposalId) external {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        require(!proposal.executed, "Proposal already executed");
        require(msg.sender == proposal.proposer || msg.sender == owner(), "Not authorized");

        proposal.canceled = true;
        emit ProposalCanceled(proposalId, msg.sender);
    }

    function quorumReached(uint256 proposalId) public view returns (bool) {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) {
            return false;
        }

        uint256 requiredVotes = (proposal.quorumSnapshot * quorumBps) / BPS_DENOMINATOR;
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        return totalVotes >= requiredVotes;
    }

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

    function getProposalPayload(
        uint256 proposalId
    ) external view returns (bytes memory data, string memory description) {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.id != 0, "Proposal not found");
        return (proposal.data, proposal.description);
    }

    receive() external payable {}
}
