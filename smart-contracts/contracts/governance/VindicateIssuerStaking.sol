// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IGovernanceVotingPower.sol";

/// @title VindicateIssuerStaking
/// @notice Staking, slashing, and reputation weighting for issuer accountability and DAO participation.
contract VindicateIssuerStaking is AccessControl, ReentrancyGuard, IGovernanceVotingPower {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    bytes32 public constant REPUTATION_ORACLE_ROLE = keccak256("REPUTATION_ORACLE_ROLE");

    struct IssuerStake {
        uint256 activeStake;
        uint256 pendingUnstake;
        uint64 unstakeReadyAt;
        uint64 lastActionAt;
        uint256 totalSlashed;
        uint256 reputationScore;
        bool approvedIssuer;
    }

    IERC20 public immutable stakingToken;
    address public slashTreasury;

    uint256 public minimumStake;
    uint64 public unstakeCooldownSeconds;
    uint256 public reputationWeightMultiplier;

    uint256 public totalStaked;
    uint256 public totalPositiveReputation;

    mapping(address => IssuerStake) public issuerStakes;

    event Staked(address indexed issuer, uint256 amount, uint256 newActiveStake);
    event UnstakeRequested(address indexed issuer, uint256 amount, uint64 availableAt);
    event UnstakeWithdrawn(address indexed issuer, uint256 amount);
    event IssuerSlashed(address indexed issuer, uint256 amount, bytes32 evidenceHash, uint256 newActiveStake);
    event ReputationUpdated(address indexed issuer, uint256 previousScore, uint256 newScore);
    event IssuerApprovalUpdated(address indexed issuer, bool approved);
    event StakingParametersUpdated(uint256 minimumStake, uint64 unstakeCooldownSeconds, uint256 reputationWeightMultiplier);
    event SlashTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    error InvalidAddress();
    error InvalidAmount();
    error InsufficientStake();
    error UnstakeNotReady();
    error IssuerNotApproved();

    constructor(
        address admin,
        address governance,
        address slasher,
        address reputationOracle,
        address stakingTokenAddress,
        address slashTreasuryAddress,
        uint256 minimumStakeAmount,
        uint64 cooldownSeconds,
        uint256 reputationMultiplier
    ) {
        if (
            admin == address(0) ||
            governance == address(0) ||
            slasher == address(0) ||
            reputationOracle == address(0) ||
            stakingTokenAddress == address(0) ||
            slashTreasuryAddress == address(0)
        ) {
            revert InvalidAddress();
        }
        if (minimumStakeAmount == 0 || cooldownSeconds == 0 || reputationMultiplier == 0) {
            revert InvalidAmount();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);
        _grantRole(SLASHER_ROLE, slasher);
        _grantRole(REPUTATION_ORACLE_ROLE, reputationOracle);

        stakingToken = IERC20(stakingTokenAddress);
        slashTreasury = slashTreasuryAddress;
        minimumStake = minimumStakeAmount;
        unstakeCooldownSeconds = cooldownSeconds;
        reputationWeightMultiplier = reputationMultiplier;
    }

    function setStakingParameters(
        uint256 minimumStakeAmount,
        uint64 cooldownSeconds,
        uint256 reputationMultiplier
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (minimumStakeAmount == 0 || cooldownSeconds == 0 || reputationMultiplier == 0) {
            revert InvalidAmount();
        }

        minimumStake = minimumStakeAmount;
        unstakeCooldownSeconds = cooldownSeconds;
        reputationWeightMultiplier = reputationMultiplier;

        emit StakingParametersUpdated(minimumStakeAmount, cooldownSeconds, reputationMultiplier);
    }

    function setSlashTreasury(address newTreasury) external onlyRole(GOVERNANCE_ROLE) {
        if (newTreasury == address(0)) {
            revert InvalidAddress();
        }

        address previous = slashTreasury;
        slashTreasury = newTreasury;
        emit SlashTreasuryUpdated(previous, newTreasury);
    }

    function setIssuerApproval(address issuer, bool approved) external onlyRole(GOVERNANCE_ROLE) {
        if (issuer == address(0)) {
            revert InvalidAddress();
        }

        IssuerStake storage stakePosition = issuerStakes[issuer];
        if (approved && stakePosition.activeStake < minimumStake) {
            revert InsufficientStake();
        }

        stakePosition.approvedIssuer = approved;
        stakePosition.lastActionAt = uint64(block.timestamp);

        emit IssuerApprovalUpdated(issuer, approved);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }

        IssuerStake storage stakePosition = issuerStakes[msg.sender];

        bool transferred = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(transferred, "TOKEN_TRANSFER_FAILED");

        stakePosition.activeStake += amount;
        stakePosition.lastActionAt = uint64(block.timestamp);
        totalStaked += amount;

        emit Staked(msg.sender, amount, stakePosition.activeStake);
    }

    function requestUnstake(uint256 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }

        IssuerStake storage stakePosition = issuerStakes[msg.sender];
        if (stakePosition.activeStake < amount) {
            revert InsufficientStake();
        }

        uint256 remaining = stakePosition.activeStake - amount;
        if (stakePosition.approvedIssuer && remaining < minimumStake) {
            revert InsufficientStake();
        }

        stakePosition.activeStake = remaining;
        stakePosition.pendingUnstake += amount;
        stakePosition.unstakeReadyAt = uint64(block.timestamp + unstakeCooldownSeconds);
        stakePosition.lastActionAt = uint64(block.timestamp);

        totalStaked -= amount;

        emit UnstakeRequested(msg.sender, amount, stakePosition.unstakeReadyAt);
    }

    function withdrawUnstaked() external nonReentrant {
        IssuerStake storage stakePosition = issuerStakes[msg.sender];
        uint256 amount = stakePosition.pendingUnstake;
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (block.timestamp < stakePosition.unstakeReadyAt) {
            revert UnstakeNotReady();
        }

        stakePosition.pendingUnstake = 0;
        stakePosition.unstakeReadyAt = 0;
        stakePosition.lastActionAt = uint64(block.timestamp);

        bool transferred = stakingToken.transfer(msg.sender, amount);
        require(transferred, "TOKEN_TRANSFER_FAILED");

        emit UnstakeWithdrawn(msg.sender, amount);
    }

    function slashIssuer(address issuer, uint256 amount, bytes32 evidenceHash) external onlyRole(SLASHER_ROLE) {
        if (issuer == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }

        IssuerStake storage stakePosition = issuerStakes[issuer];
        uint256 slashable = stakePosition.activeStake + stakePosition.pendingUnstake;
        if (slashable < amount) {
            revert InsufficientStake();
        }

        uint256 fromActive = amount <= stakePosition.activeStake ? amount : stakePosition.activeStake;
        uint256 fromPending = amount - fromActive;

        if (fromActive > 0) {
            stakePosition.activeStake -= fromActive;
            totalStaked -= fromActive;
        }

        if (fromPending > 0) {
            stakePosition.pendingUnstake -= fromPending;
        }

        stakePosition.totalSlashed += amount;
        stakePosition.lastActionAt = uint64(block.timestamp);

        bool transferred = stakingToken.transfer(slashTreasury, amount);
        require(transferred, "TOKEN_TRANSFER_FAILED");

        emit IssuerSlashed(issuer, amount, evidenceHash, stakePosition.activeStake);
    }

    function rewardReputation(address issuer, uint256 points) external onlyRole(REPUTATION_ORACLE_ROLE) {
        if (issuer == address(0) || points == 0) {
            revert InvalidAmount();
        }

        IssuerStake storage stakePosition = issuerStakes[issuer];
        uint256 previous = stakePosition.reputationScore;
        stakePosition.reputationScore = previous + points;
        stakePosition.lastActionAt = uint64(block.timestamp);

        totalPositiveReputation += points;

        emit ReputationUpdated(issuer, previous, stakePosition.reputationScore);
    }

    function penalizeReputation(address issuer, uint256 points) external onlyRole(REPUTATION_ORACLE_ROLE) {
        if (issuer == address(0) || points == 0) {
            revert InvalidAmount();
        }

        IssuerStake storage stakePosition = issuerStakes[issuer];
        uint256 previous = stakePosition.reputationScore;
        uint256 reduction = points > previous ? previous : points;
        stakePosition.reputationScore = previous - reduction;
        stakePosition.lastActionAt = uint64(block.timestamp);

        totalPositiveReputation -= reduction;

        emit ReputationUpdated(issuer, previous, stakePosition.reputationScore);
    }

    function canIssue(address issuer) external view returns (bool) {
        IssuerStake memory stakePosition = issuerStakes[issuer];
        return stakePosition.approvedIssuer && stakePosition.activeStake >= minimumStake;
    }

    function governanceWeight(address account) public view override returns (uint256) {
        IssuerStake memory stakePosition = issuerStakes[account];
        return stakePosition.activeStake + (stakePosition.reputationScore * reputationWeightMultiplier);
    }

    function totalGovernanceWeight() public view override returns (uint256) {
        return totalStaked + (totalPositiveReputation * reputationWeightMultiplier);
    }
}
