// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IStakeSlasher {
    function slashIssuer(address issuer, uint256 amount, bytes32 evidenceHash) external;
}

/// @title VindicateSlashingCourt
/// @notice Bond-backed slashing workflow that reduces false-report risk before slash execution.
contract VindicateSlashingCourt is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant COURT_ADMIN_ROLE = keccak256("COURT_ADMIN_ROLE");
    bytes32 public constant ADJUDICATOR_ROLE = keccak256("ADJUDICATOR_ROLE");

    enum CaseStatus {
        OPEN,
        APPROVED,
        REJECTED,
        EXECUTED
    }

    struct SlashCase {
        uint256 id;
        address reporter;
        address issuer;
        uint256 slashAmount;
        uint256 reporterBond;
        bytes32 evidenceHash;
        bytes32 verdictHash;
        uint64 createdAt;
        uint64 reviewEndsAt;
        CaseStatus status;
        bool bondClaimed;
    }

    IERC20 public immutable bondToken;
    IStakeSlasher public immutable stakingContract;
    address public insuranceTreasury;

    uint256 public caseCount;
    uint256 public minimumReporterBond;
    uint64 public reviewPeriodSeconds;

    mapping(uint256 => SlashCase) public slashCases;

    event CaseOpened(
        uint256 indexed caseId,
        address indexed reporter,
        address indexed issuer,
        uint256 slashAmount,
        uint256 reporterBond,
        bytes32 evidenceHash,
        uint64 reviewEndsAt
    );
    event CaseResolved(uint256 indexed caseId, bool approved, bytes32 verdictHash);
    event CaseExecuted(uint256 indexed caseId, address indexed issuer, uint256 slashAmount);
    event BondClaimed(uint256 indexed caseId, address indexed reporter, uint256 amount);
    event ParametersUpdated(uint256 minimumReporterBond, uint64 reviewPeriodSeconds, address insuranceTreasury);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidCaseState();
    error ReviewWindowActive();
    error UnauthorizedReporter();

    constructor(
        address admin,
        address adjudicator,
        address bondTokenAddress,
        address stakingContractAddress,
        address insuranceTreasuryAddress,
        uint256 minimumBond,
        uint64 reviewPeriod
    ) {
        if (
            admin == address(0) ||
            adjudicator == address(0) ||
            bondTokenAddress == address(0) ||
            stakingContractAddress == address(0) ||
            insuranceTreasuryAddress == address(0)
        ) {
            revert InvalidAddress();
        }
        if (minimumBond == 0 || reviewPeriod == 0) {
            revert InvalidAmount();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COURT_ADMIN_ROLE, admin);
        _grantRole(ADJUDICATOR_ROLE, adjudicator);

        bondToken = IERC20(bondTokenAddress);
        stakingContract = IStakeSlasher(stakingContractAddress);
        insuranceTreasury = insuranceTreasuryAddress;
        minimumReporterBond = minimumBond;
        reviewPeriodSeconds = reviewPeriod;
    }

    function setParameters(
        uint256 minimumBond,
        uint64 reviewPeriod,
        address insuranceTreasuryAddress
    ) external onlyRole(COURT_ADMIN_ROLE) {
        if (minimumBond == 0 || reviewPeriod == 0 || insuranceTreasuryAddress == address(0)) {
            revert InvalidAmount();
        }

        minimumReporterBond = minimumBond;
        reviewPeriodSeconds = reviewPeriod;
        insuranceTreasury = insuranceTreasuryAddress;

        emit ParametersUpdated(minimumBond, reviewPeriod, insuranceTreasuryAddress);
    }

    function openCase(
        address issuer,
        uint256 slashAmount,
        uint256 reporterBond,
        bytes32 evidenceHash
    ) external returns (uint256 caseId) {
        if (issuer == address(0)) {
            revert InvalidAddress();
        }
        if (slashAmount == 0 || reporterBond < minimumReporterBond || evidenceHash == bytes32(0)) {
            revert InvalidAmount();
        }

        bondToken.safeTransferFrom(msg.sender, address(this), reporterBond);

        caseId = ++caseCount;
        uint64 reviewEnd = uint64(block.timestamp + reviewPeriodSeconds);

        slashCases[caseId] = SlashCase({
            id: caseId,
            reporter: msg.sender,
            issuer: issuer,
            slashAmount: slashAmount,
            reporterBond: reporterBond,
            evidenceHash: evidenceHash,
            verdictHash: bytes32(0),
            createdAt: uint64(block.timestamp),
            reviewEndsAt: reviewEnd,
            status: CaseStatus.OPEN,
            bondClaimed: false
        });

        emit CaseOpened(caseId, msg.sender, issuer, slashAmount, reporterBond, evidenceHash, reviewEnd);
    }

    function resolveCase(uint256 caseId, bool approve, bytes32 verdictHash) external onlyRole(ADJUDICATOR_ROLE) {
        SlashCase storage slashCase = slashCases[caseId];
        if (slashCase.id == 0 || slashCase.status != CaseStatus.OPEN) {
            revert InvalidCaseState();
        }
        if (block.timestamp < slashCase.reviewEndsAt) {
            revert ReviewWindowActive();
        }

        slashCase.verdictHash = verdictHash;
        slashCase.status = approve ? CaseStatus.APPROVED : CaseStatus.REJECTED;

        if (!approve) {
            bondToken.safeTransfer(insuranceTreasury, slashCase.reporterBond);
            slashCase.bondClaimed = true;
        }

        emit CaseResolved(caseId, approve, verdictHash);
    }

    function executeApprovedSlash(uint256 caseId) external onlyRole(ADJUDICATOR_ROLE) {
        SlashCase storage slashCase = slashCases[caseId];
        if (slashCase.id == 0 || slashCase.status != CaseStatus.APPROVED) {
            revert InvalidCaseState();
        }

        stakingContract.slashIssuer(slashCase.issuer, slashCase.slashAmount, slashCase.evidenceHash);
        slashCase.status = CaseStatus.EXECUTED;

        emit CaseExecuted(caseId, slashCase.issuer, slashCase.slashAmount);
    }

    function claimReporterBond(uint256 caseId) external {
        SlashCase storage slashCase = slashCases[caseId];
        if (slashCase.id == 0 || slashCase.reporter != msg.sender) {
            revert UnauthorizedReporter();
        }
        if (slashCase.status != CaseStatus.EXECUTED || slashCase.bondClaimed) {
            revert InvalidCaseState();
        }

        slashCase.bondClaimed = true;
        bondToken.safeTransfer(msg.sender, slashCase.reporterBond);

        emit BondClaimed(caseId, msg.sender, slashCase.reporterBond);
    }
}