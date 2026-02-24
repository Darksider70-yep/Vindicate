// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title VindicateVestingVault
/// @notice Linear vesting vault for treasury, core team, investor, and ecosystem allocations.
contract VindicateVestingVault is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant SCHEDULE_ADMIN_ROLE = keccak256("SCHEDULE_ADMIN_ROLE");

    struct VestingSchedule {
        uint256 id;
        address beneficiary;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 revokedVestedAmount;
        uint64 startTime;
        uint64 cliffTime;
        uint64 endTime;
        bool revocable;
        bool revoked;
    }

    IERC20 public immutable token;
    uint256 public scheduleCount;

    mapping(uint256 => VestingSchedule) public schedules;
    mapping(address => uint256[]) public schedulesByBeneficiary;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 totalAmount,
        uint64 startTime,
        uint64 cliffTime,
        uint64 endTime,
        bool revocable
    );
    event Claimed(uint256 indexed scheduleId, address indexed beneficiary, uint256 amount);
    event Revoked(uint256 indexed scheduleId, address indexed beneficiary, uint256 unvestedReturned);

    error InvalidAddress();
    error InvalidSchedule();
    error NothingToClaim();

    constructor(address admin, address scheduleAdmin, address tokenAddress) {
        if (admin == address(0) || scheduleAdmin == address(0) || tokenAddress == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SCHEDULE_ADMIN_ROLE, scheduleAdmin);
        token = IERC20(tokenAddress);
    }

    function createSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint64 startTime,
        uint64 cliffTime,
        uint64 endTime,
        bool revocable
    ) external onlyRole(SCHEDULE_ADMIN_ROLE) returns (uint256 scheduleId) {
        if (beneficiary == address(0)) {
            revert InvalidAddress();
        }
        if (totalAmount == 0 || startTime == 0 || cliffTime < startTime || endTime <= cliffTime) {
            revert InvalidSchedule();
        }

        scheduleId = ++scheduleCount;

        schedules[scheduleId] = VestingSchedule({
            id: scheduleId,
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            claimedAmount: 0,
            revokedVestedAmount: 0,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime,
            revocable: revocable,
            revoked: false
        });

        schedulesByBeneficiary[beneficiary].push(scheduleId);

        emit ScheduleCreated(scheduleId, beneficiary, totalAmount, startTime, cliffTime, endTime, revocable);
    }

    function claim(uint256 scheduleId) external returns (uint256 claimableAmount) {
        VestingSchedule storage schedule = schedules[scheduleId];
        if (schedule.id == 0 || schedule.beneficiary != msg.sender) {
            revert InvalidSchedule();
        }

        uint256 vested = vestedAmount(scheduleId, uint64(block.timestamp));
        if (vested <= schedule.claimedAmount) {
            revert NothingToClaim();
        }

        claimableAmount = vested - schedule.claimedAmount;
        schedule.claimedAmount = vested;

        token.safeTransfer(msg.sender, claimableAmount);
        emit Claimed(scheduleId, msg.sender, claimableAmount);
    }

    function revoke(uint256 scheduleId, address treasuryReceiver) external onlyRole(SCHEDULE_ADMIN_ROLE) {
        VestingSchedule storage schedule = schedules[scheduleId];
        if (schedule.id == 0 || !schedule.revocable || schedule.revoked || treasuryReceiver == address(0)) {
            revert InvalidSchedule();
        }

        uint256 vested = vestedAmount(scheduleId, uint64(block.timestamp));
        uint256 unvested = schedule.totalAmount - vested;

        schedule.revokedVestedAmount = vested;
        schedule.revoked = true;

        if (unvested > 0) {
            token.safeTransfer(treasuryReceiver, unvested);
        }

        emit Revoked(scheduleId, schedule.beneficiary, unvested);
    }

    function vestedAmount(uint256 scheduleId, uint64 timestamp) public view returns (uint256) {
        VestingSchedule memory schedule = schedules[scheduleId];
        if (schedule.id == 0) {
            return 0;
        }
        if (schedule.revoked) {
            return schedule.revokedVestedAmount;
        }

        if (timestamp < schedule.cliffTime) {
            return 0;
        }

        if (timestamp >= schedule.endTime) {
            return schedule.totalAmount;
        }

        uint256 elapsed = uint256(timestamp - schedule.startTime);
        uint256 duration = uint256(schedule.endTime - schedule.startTime);
        return (schedule.totalAmount * elapsed) / duration;
    }

    function releasableAmount(uint256 scheduleId) external view returns (uint256) {
        VestingSchedule memory schedule = schedules[scheduleId];
        uint256 vested = vestedAmount(scheduleId, uint64(block.timestamp));
        if (vested <= schedule.claimedAmount) {
            return 0;
        }
        return vested - schedule.claimedAmount;
    }
}
