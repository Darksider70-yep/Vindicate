// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title VindicateVerificationRewards
/// @notice Optional claim-based rewards pool for verifiers, institutions, and developers.
contract VindicateVerificationRewards is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant REWARD_ADMIN_ROLE = keccak256("REWARD_ADMIN_ROLE");
    bytes32 public constant REWARD_ORACLE_ROLE = keccak256("REWARD_ORACLE_ROLE");

    enum RewardAction {
        VERIFICATION,
        INSTITUTION_INTEGRATION,
        SDK_CONTRIBUTION,
        DEVELOPER_GRANT
    }

    IERC20 public immutable rewardToken;

    uint256 public epoch;
    mapping(RewardAction => uint256) public rewardRateByAction;
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public claimedRewards;

    event RewardRateUpdated(RewardAction indexed action, uint256 rewardRate);
    event RewardsCredited(address indexed recipient, RewardAction indexed action, uint256 units, uint256 rewardAmount, uint256 indexed epoch);
    event RewardsClaimed(address indexed recipient, uint256 amount);
    event EpochAdvanced(uint256 indexed previousEpoch, uint256 indexed nextEpoch);

    error InvalidAddress();
    error InvalidAmount();
    error NoRewards();

    constructor(address admin, address rewardOracle, address rewardTokenAddress) {
        if (admin == address(0) || rewardOracle == address(0) || rewardTokenAddress == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REWARD_ADMIN_ROLE, admin);
        _grantRole(REWARD_ORACLE_ROLE, rewardOracle);

        rewardToken = IERC20(rewardTokenAddress);
        epoch = 1;
    }

    function setRewardRate(RewardAction action, uint256 rewardRate) external onlyRole(REWARD_ADMIN_ROLE) {
        rewardRateByAction[action] = rewardRate;
        emit RewardRateUpdated(action, rewardRate);
    }

    function creditRewards(address recipient, RewardAction action, uint256 units) external onlyRole(REWARD_ORACLE_ROLE) {
        if (recipient == address(0)) {
            revert InvalidAddress();
        }
        if (units == 0) {
            revert InvalidAmount();
        }

        uint256 rewardRate = rewardRateByAction[action];
        if (rewardRate == 0) {
            revert InvalidAmount();
        }

        uint256 rewardAmount = rewardRate * units;
        pendingRewards[recipient] += rewardAmount;

        emit RewardsCredited(recipient, action, units, rewardAmount, epoch);
    }

    function claimRewards() external {
        uint256 amount = pendingRewards[msg.sender];
        if (amount == 0) {
            revert NoRewards();
        }

        pendingRewards[msg.sender] = 0;
        claimedRewards[msg.sender] += amount;

        rewardToken.safeTransfer(msg.sender, amount);

        emit RewardsClaimed(msg.sender, amount);
    }

    function advanceEpoch() external onlyRole(REWARD_ADMIN_ROLE) {
        uint256 previous = epoch;
        epoch = previous + 1;
        emit EpochAdvanced(previous, epoch);
    }

    function fundRewards(uint256 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }
}