// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title VindicateTreasury
/// @notice DAO treasury router for protocol fees, grants, insurance reserves, and burn sinks.
contract VindicateTreasury is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");

    struct AllocationConfig {
        address rewardsVault;
        address grantsVault;
        address insuranceVault;
        address operationsVault;
        address burnSink;
        uint16 rewardsBps;
        uint16 grantsBps;
        uint16 insuranceBps;
        uint16 operationsBps;
        uint16 burnBps;
    }

    AllocationConfig public allocation;

    mapping(address => uint256) public totalRoutedByToken;
    mapping(address => uint256) public totalToRewardsByToken;
    mapping(address => uint256) public totalToGrantsByToken;
    mapping(address => uint256) public totalToInsuranceByToken;
    mapping(address => uint256) public totalToOperationsByToken;
    mapping(address => uint256) public totalToBurnByToken;

    event AllocationUpdated(
        address rewardsVault,
        address grantsVault,
        address insuranceVault,
        address operationsVault,
        address burnSink,
        uint16 rewardsBps,
        uint16 grantsBps,
        uint16 insuranceBps,
        uint16 operationsBps,
        uint16 burnBps
    );
    event FeeRouted(address indexed token, uint256 amount, address indexed collector);
    event NativeFeeRouted(uint256 amount, address indexed collector);

    error InvalidAddress();
    error InvalidBps();
    error InvalidAmount();

    constructor(address admin, address governance, address feeCollector, AllocationConfig memory initialAllocation) {
        if (admin == address(0) || governance == address(0) || feeCollector == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);
        _grantRole(FEE_COLLECTOR_ROLE, feeCollector);

        _setAllocation(initialAllocation);
    }

    receive() external payable {}

    function setAllocation(AllocationConfig calldata nextAllocation) external onlyRole(GOVERNANCE_ROLE) {
        _setAllocation(nextAllocation);
    }

    function routeProtocolFee(address token, uint256 amount) external onlyRole(FEE_COLLECTOR_ROLE) {
        if (token == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }

        IERC20 erc20 = IERC20(token);
        erc20.safeTransferFrom(msg.sender, address(this), amount);

        _distributeToken(erc20, amount);

        totalRoutedByToken[token] += amount;
        emit FeeRouted(token, amount, msg.sender);
    }

    function routeNativeFee() external payable onlyRole(FEE_COLLECTOR_ROLE) {
        if (msg.value == 0) {
            revert InvalidAmount();
        }

        _distributeNative(msg.value);
        emit NativeFeeRouted(msg.value, msg.sender);
    }

    function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0) || to == address(0)) {
            revert InvalidAddress();
        }
        IERC20(token).safeTransfer(to, amount);
    }

    function emergencyWithdrawNative(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        (bool success,) = to.call{value: amount}("");
        require(success, "NATIVE_WITHDRAW_FAILED");
    }

    function _setAllocation(AllocationConfig memory cfg) internal {
        if (
            cfg.rewardsVault == address(0) ||
            cfg.grantsVault == address(0) ||
            cfg.insuranceVault == address(0) ||
            cfg.operationsVault == address(0)
        ) {
            revert InvalidAddress();
        }

        uint256 totalBps = uint256(cfg.rewardsBps)
            + uint256(cfg.grantsBps)
            + uint256(cfg.insuranceBps)
            + uint256(cfg.operationsBps)
            + uint256(cfg.burnBps);

        if (totalBps != 10_000) {
            revert InvalidBps();
        }

        allocation = cfg;

        emit AllocationUpdated(
            cfg.rewardsVault,
            cfg.grantsVault,
            cfg.insuranceVault,
            cfg.operationsVault,
            cfg.burnSink,
            cfg.rewardsBps,
            cfg.grantsBps,
            cfg.insuranceBps,
            cfg.operationsBps,
            cfg.burnBps
        );
    }

    function _distributeToken(IERC20 token, uint256 amount) internal {
        uint256 rewardsShare = (amount * allocation.rewardsBps) / 10_000;
        uint256 grantsShare = (amount * allocation.grantsBps) / 10_000;
        uint256 insuranceShare = (amount * allocation.insuranceBps) / 10_000;
        uint256 operationsShare = (amount * allocation.operationsBps) / 10_000;
        uint256 burnShare = amount - rewardsShare - grantsShare - insuranceShare - operationsShare;

        token.safeTransfer(allocation.rewardsVault, rewardsShare);
        token.safeTransfer(allocation.grantsVault, grantsShare);
        token.safeTransfer(allocation.insuranceVault, insuranceShare);
        token.safeTransfer(allocation.operationsVault, operationsShare);

        if (burnShare > 0) {
            address burnTarget = allocation.burnSink;
            if (burnTarget == address(0)) {
                burnTarget = 0x000000000000000000000000000000000000dEaD;
            }
            token.safeTransfer(burnTarget, burnShare);
        }

        address tokenAddress = address(token);
        totalToRewardsByToken[tokenAddress] += rewardsShare;
        totalToGrantsByToken[tokenAddress] += grantsShare;
        totalToInsuranceByToken[tokenAddress] += insuranceShare;
        totalToOperationsByToken[tokenAddress] += operationsShare;
        totalToBurnByToken[tokenAddress] += burnShare;
    }

    function _distributeNative(uint256 amount) internal {
        uint256 rewardsShare = (amount * allocation.rewardsBps) / 10_000;
        uint256 grantsShare = (amount * allocation.grantsBps) / 10_000;
        uint256 insuranceShare = (amount * allocation.insuranceBps) / 10_000;
        uint256 operationsShare = (amount * allocation.operationsBps) / 10_000;
        uint256 burnShare = amount - rewardsShare - grantsShare - insuranceShare - operationsShare;

        _sendNative(payable(allocation.rewardsVault), rewardsShare);
        _sendNative(payable(allocation.grantsVault), grantsShare);
        _sendNative(payable(allocation.insuranceVault), insuranceShare);
        _sendNative(payable(allocation.operationsVault), operationsShare);

        if (burnShare > 0) {
            address burnTarget = allocation.burnSink;
            if (burnTarget == address(0)) {
                burnTarget = 0x000000000000000000000000000000000000dEaD;
            }
            _sendNative(payable(burnTarget), burnShare);
        }

        totalRoutedByToken[address(0)] += amount;
        totalToRewardsByToken[address(0)] += rewardsShare;
        totalToGrantsByToken[address(0)] += grantsShare;
        totalToInsuranceByToken[address(0)] += insuranceShare;
        totalToOperationsByToken[address(0)] += operationsShare;
        totalToBurnByToken[address(0)] += burnShare;
    }

    function _sendNative(address payable to, uint256 amount) internal {
        if (amount == 0) {
            return;
        }
        (bool success,) = to.call{value: amount}("");
        require(success, "NATIVE_TRANSFER_FAILED");
    }
}