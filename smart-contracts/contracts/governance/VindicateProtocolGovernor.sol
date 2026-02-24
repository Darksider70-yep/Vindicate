// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IGovernanceVotingPower.sol";

/// @title VindicateProtocolGovernor
/// @notice DAO governance timelock executor for protocol upgrades and operations.
contract VindicateProtocolGovernor is AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    enum GovernanceModel {
        TOKEN,
        REPUTATION,
        HYBRID
    }

    enum ProposalType {
        GENERIC_CALL,
        ISSUER_APPROVAL,
        EMERGENCY_PAUSE,
        PARAMETER_CHANGE
    }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        address target;
        address issuerCandidate;
        bytes32 parameterKey;
        uint256 parameterValue;
        uint256 value;
        bytes callData;
        bytes32 descriptionHash;
        uint256 quorumSnapshot;
        uint64 startTime;
        uint64 endTime;
        uint64 eta;
        bool executed;
        bool canceled;
        uint256 forVotes;
        uint256 againstVotes;
    }

    IERC20 public immutable votingToken;
    IGovernanceVotingPower public immutable reputationSource;
    GovernanceModel public governanceModel;

    uint256 public proposalCount;
    uint64 public votingDelaySeconds;
    uint64 public votingPeriodSeconds;
    uint64 public timelockDelaySeconds;
    uint256 public proposalThreshold;
    uint16 public quorumBps;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType indexed proposalType,
        address indexed proposer,
        address target,
        bytes32 descriptionHash,
        uint64 startTime,
        uint64 endTime,
        uint256 quorumSnapshot
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalQueued(uint256 indexed proposalId, uint64 eta);
    event ProposalExecuted(uint256 indexed proposalId, bytes result);
    event ProposalCanceled(uint256 indexed proposalId, address indexed guardian);
    event GovernanceParamsUpdated(
        uint64 votingDelaySeconds,
        uint64 votingPeriodSeconds,
        uint64 timelockDelaySeconds,
        uint256 proposalThreshold,
        uint16 quorumBps
    );

    error InvalidAddress();
    error InvalidGovernanceConfig();
    error ProposalNotFound();
    error ProposalNotActive();
    error ProposalNotFinished();
    error ProposalNotQueued();
    error ProposalVoteAlreadyCast();
    error ProposalNotSuccessful();
    error ProposalExecutionTooEarly();
    error ProposalExecutionFailed();
    error ProposalUnavailable();
    error InsufficientVotingPower();

    constructor(
        address admin,
        address guardian,
        address executor,
        address votingTokenAddress,
        address reputationSourceAddress,
        GovernanceModel model,
        uint64 votingDelay,
        uint64 votingPeriod,
        uint64 timelockDelay,
        uint256 threshold,
        uint16 quorumBasisPoints
    ) {
        if (admin == address(0) || guardian == address(0) || executor == address(0)) {
            revert InvalidAddress();
        }
        if (quorumBasisPoints == 0 || quorumBasisPoints > 10000 || votingPeriod == 0) {
            revert InvalidGovernanceConfig();
        }
        if (model != GovernanceModel.REPUTATION && votingTokenAddress == address(0)) {
            revert InvalidAddress();
        }
        if (model != GovernanceModel.TOKEN && reputationSourceAddress == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, guardian);
        _grantRole(EXECUTOR_ROLE, executor);

        votingToken = IERC20(votingTokenAddress);
        reputationSource = IGovernanceVotingPower(reputationSourceAddress);
        governanceModel = model;

        votingDelaySeconds = votingDelay;
        votingPeriodSeconds = votingPeriod;
        timelockDelaySeconds = timelockDelay;
        proposalThreshold = threshold;
        quorumBps = quorumBasisPoints;
    }

    receive() external payable {}

    function setGovernanceParams(
        uint64 votingDelay,
        uint64 votingPeriod,
        uint64 timelockDelay,
        uint256 threshold,
        uint16 quorumBasisPoints
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (quorumBasisPoints == 0 || quorumBasisPoints > 10000 || votingPeriod == 0) {
            revert InvalidGovernanceConfig();
        }

        votingDelaySeconds = votingDelay;
        votingPeriodSeconds = votingPeriod;
        timelockDelaySeconds = timelockDelay;
        proposalThreshold = threshold;
        quorumBps = quorumBasisPoints;

        emit GovernanceParamsUpdated(votingDelay, votingPeriod, timelockDelay, threshold, quorumBasisPoints);
    }

    function createGenericProposal(
        address target,
        uint256 value,
        bytes calldata callData,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId) {
        proposalId = _createProposal(
            ProposalType.GENERIC_CALL,
            target,
            address(0),
            bytes32(0),
            0,
            value,
            callData,
            descriptionHash
        );
    }

    function proposeIssuerApproval(
        address protocolCore,
        address issuer,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId) {
        bytes memory callData = abi.encodeWithSignature("approveIssuer(address)", issuer);
        proposalId = _createProposal(
            ProposalType.ISSUER_APPROVAL,
            protocolCore,
            issuer,
            bytes32(0),
            0,
            0,
            callData,
            descriptionHash
        );
    }

    function proposeEmergencyPause(
        address protocolCore,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId) {
        bytes memory callData = abi.encodeWithSignature("pauseIssuance()");
        proposalId = _createProposal(
            ProposalType.EMERGENCY_PAUSE,
            protocolCore,
            address(0),
            bytes32(0),
            0,
            0,
            callData,
            descriptionHash
        );
    }

    function proposeParameterChange(
        address target,
        bytes32 parameterKey,
        uint256 parameterValue,
        bytes calldata callData,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId) {
        proposalId = _createProposal(
            ProposalType.PARAMETER_CHANGE,
            target,
            address(0),
            parameterKey,
            parameterValue,
            0,
            callData,
            descriptionHash
        );
    }

    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert ProposalNotFound();
        }
        if (proposal.canceled || proposal.executed) {
            revert ProposalUnavailable();
        }

        uint256 nowTs = block.timestamp;
        if (nowTs < proposal.startTime || nowTs > proposal.endTime) {
            revert ProposalNotActive();
        }

        if (hasVoted[proposalId][msg.sender]) {
            revert ProposalVoteAlreadyCast();
        }

        uint256 weight = votingPowerOf(msg.sender);
        if (weight == 0) {
            revert InsufficientVotingPower();
        }

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function queueProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert ProposalNotFound();
        }
        if (proposal.canceled || proposal.executed) {
            revert ProposalUnavailable();
        }
        if (proposal.eta != 0) {
            revert ProposalNotQueued();
        }
        if (block.timestamp <= proposal.endTime) {
            revert ProposalNotFinished();
        }
        if (!_isProposalSuccessful(proposal)) {
            revert ProposalNotSuccessful();
        }

        proposal.eta = uint64(block.timestamp + timelockDelaySeconds);
        emit ProposalQueued(proposalId, proposal.eta);
    }

    function executeProposal(uint256 proposalId) external onlyRole(EXECUTOR_ROLE) returns (bytes memory result) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert ProposalNotFound();
        }
        if (proposal.canceled || proposal.executed) {
            revert ProposalUnavailable();
        }
        if (proposal.eta == 0) {
            revert ProposalNotQueued();
        }
        if (block.timestamp < proposal.eta) {
            revert ProposalExecutionTooEarly();
        }

        (bool success, bytes memory returndata) = proposal.target.call{value: proposal.value}(proposal.callData);
        if (!success) {
            revert ProposalExecutionFailed();
        }

        proposal.executed = true;
        emit ProposalExecuted(proposalId, returndata);
        return returndata;
    }

    function cancelProposal(uint256 proposalId) external onlyRole(GUARDIAN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert ProposalNotFound();
        }
        if (proposal.executed) {
            revert ProposalUnavailable();
        }

        proposal.canceled = true;
        emit ProposalCanceled(proposalId, msg.sender);
    }

    function votingPowerOf(address voter) public view returns (uint256) {
        if (governanceModel == GovernanceModel.TOKEN) {
            return votingToken.balanceOf(voter);
        }
        if (governanceModel == GovernanceModel.REPUTATION) {
            return reputationSource.governanceWeight(voter);
        }
        return votingToken.balanceOf(voter) + reputationSource.governanceWeight(voter);
    }

    function totalVotingPower() public view returns (uint256) {
        if (governanceModel == GovernanceModel.TOKEN) {
            return votingToken.totalSupply();
        }
        if (governanceModel == GovernanceModel.REPUTATION) {
            return reputationSource.totalGovernanceWeight();
        }
        return votingToken.totalSupply() + reputationSource.totalGovernanceWeight();
    }

    function quorumRequired(uint256 proposalId) external view returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert ProposalNotFound();
        }
        return proposal.quorumSnapshot;
    }

    function isProposalSuccessful(uint256 proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert ProposalNotFound();
        }
        return _isProposalSuccessful(proposal);
    }

    function _createProposal(
        ProposalType proposalType,
        address target,
        address issuerCandidate,
        bytes32 parameterKey,
        uint256 parameterValue,
        uint256 value,
        bytes memory callData,
        bytes32 descriptionHash
    ) internal returns (uint256 proposalId) {
        if (target == address(0)) {
            revert InvalidAddress();
        }

        uint256 proposerPower = votingPowerOf(msg.sender);
        if (proposerPower < proposalThreshold) {
            revert InsufficientVotingPower();
        }

        proposalId = ++proposalCount;
        uint64 startTime = uint64(block.timestamp + votingDelaySeconds);
        uint64 endTime = uint64(startTime + votingPeriodSeconds);
        uint256 quorumSnapshot = (totalVotingPower() * quorumBps) / 10_000;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposalType = proposalType;
        proposal.proposer = msg.sender;
        proposal.target = target;
        proposal.issuerCandidate = issuerCandidate;
        proposal.parameterKey = parameterKey;
        proposal.parameterValue = parameterValue;
        proposal.value = value;
        proposal.callData = callData;
        proposal.descriptionHash = descriptionHash;
        proposal.quorumSnapshot = quorumSnapshot;
        proposal.startTime = startTime;
        proposal.endTime = endTime;

        emit ProposalCreated(
            proposalId,
            proposalType,
            msg.sender,
            target,
            descriptionHash,
            startTime,
            endTime,
            quorumSnapshot
        );
    }

    function _isProposalSuccessful(Proposal storage proposal) internal view returns (bool) {
        if (proposal.forVotes <= proposal.againstVotes) {
            return false;
        }
        if (proposal.forVotes < proposal.quorumSnapshot) {
            return false;
        }
        return true;
    }
}