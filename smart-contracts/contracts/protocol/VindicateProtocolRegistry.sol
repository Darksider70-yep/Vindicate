// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IVindicateCore.sol";
import "./interfaces/IVindicateVerificationModule.sol";

/// @title VindicateProtocolRegistry
/// @notice Protocol-layer registry separating core contract logic from pluggable verification modules.
/// @dev Designed for governance-controlled upgrades with permissionless verification reads.
contract VindicateProtocolRegistry is AccessControl {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant MODULE_ADMIN_ROLE = keccak256("MODULE_ADMIN_ROLE");

    struct ModuleConfig {
        address module;
        bool active;
        uint64 registeredAt;
        string moduleName;
        string moduleVersion;
    }

    address public coreContract;
    address public previousCoreContract;
    string public protocolVersion;
    string public previousProtocolVersion;
    bool public lastUpgradeBackwardCompatible;

    mapping(bytes32 => ModuleConfig) public modules;
    mapping(bytes32 => bool) public moduleExists;
    bytes32[] private _moduleIds;

    event CoreContractUpdated(
        address indexed previousCore,
        address indexed newCore,
        string previousVersion,
        string newVersion,
        bool backwardCompatible
    );
    event ModuleRegistered(bytes32 indexed moduleId, address indexed module, string moduleName, string moduleVersion);
    event ModuleStatusUpdated(bytes32 indexed moduleId, bool active);
    event ModuleRemoved(bytes32 indexed moduleId);

    error InvalidAddress();
    error InvalidCredentialHash();
    error ModuleAlreadyRegistered(bytes32 moduleId);
    error ModuleNotFound(bytes32 moduleId);

    constructor(
        address governanceAdmin,
        address moduleAdmin,
        address initialCore,
        string memory initialProtocolVersion
    ) {
        if (governanceAdmin == address(0) || moduleAdmin == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, governanceAdmin);
        _grantRole(GOVERNANCE_ROLE, governanceAdmin);
        _grantRole(MODULE_ADMIN_ROLE, moduleAdmin);

        if (initialCore != address(0)) {
            coreContract = initialCore;
        }
        protocolVersion = initialProtocolVersion;
    }

    function moduleIds() external view returns (bytes32[] memory) {
        return _moduleIds;
    }

    function setCoreContract(
        address newCore,
        string calldata newProtocolVersion,
        bool backwardCompatible
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (newCore == address(0)) {
            revert InvalidAddress();
        }

        address oldCore = coreContract;
        string memory oldVersion = protocolVersion;

        previousCoreContract = oldCore;
        previousProtocolVersion = oldVersion;
        coreContract = newCore;
        protocolVersion = newProtocolVersion;
        lastUpgradeBackwardCompatible = backwardCompatible;

        emit CoreContractUpdated(oldCore, newCore, oldVersion, newProtocolVersion, backwardCompatible);
    }

    function registerModule(bytes32 moduleId, address module, bool active) external onlyRole(MODULE_ADMIN_ROLE) {
        if (module == address(0)) {
            revert InvalidAddress();
        }
        if (moduleExists[moduleId]) {
            revert ModuleAlreadyRegistered(moduleId);
        }

        string memory name = IVindicateVerificationModule(module).moduleName();
        string memory version = IVindicateVerificationModule(module).moduleVersion();

        modules[moduleId] = ModuleConfig({
            module: module,
            active: active,
            registeredAt: uint64(block.timestamp),
            moduleName: name,
            moduleVersion: version
        });

        moduleExists[moduleId] = true;
        _moduleIds.push(moduleId);

        emit ModuleRegistered(moduleId, module, name, version);
    }

    function setModuleStatus(bytes32 moduleId, bool active) external onlyRole(MODULE_ADMIN_ROLE) {
        if (!moduleExists[moduleId]) {
            revert ModuleNotFound(moduleId);
        }

        modules[moduleId].active = active;
        emit ModuleStatusUpdated(moduleId, active);
    }

    function removeModule(bytes32 moduleId) external onlyRole(MODULE_ADMIN_ROLE) {
        if (!moduleExists[moduleId]) {
            revert ModuleNotFound(moduleId);
        }

        delete modules[moduleId];
        moduleExists[moduleId] = false;

        uint256 length = _moduleIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (_moduleIds[i] == moduleId) {
                _moduleIds[i] = _moduleIds[length - 1];
                _moduleIds.pop();
                break;
            }
        }

        emit ModuleRemoved(moduleId);
    }

    /// @notice Permissionless credential verification across core and active module extensions.
    function verifyCredentialPermissionless(
        bytes32 credentialHash
    ) external view returns (bool verified, bool coreVerified, bytes32[] memory matchedModules) {
        if (credentialHash == bytes32(0)) {
            revert InvalidCredentialHash();
        }

        if (coreContract != address(0)) {
            try IVindicateCore(coreContract).verifyCredential(credentialHash) returns (bool valid) {
                coreVerified = valid;
            } catch {
                coreVerified = false;
            }
        }

        bytes32[] memory temporaryMatches = new bytes32[](_moduleIds.length);
        uint256 matchCount = 0;

        for (uint256 i = 0; i < _moduleIds.length; i++) {
            bytes32 moduleId = _moduleIds[i];
            ModuleConfig memory config = modules[moduleId];
            if (!config.active || config.module == address(0)) {
                continue;
            }

            bool moduleVerified = false;
            try IVindicateVerificationModule(config.module).verifyCredential(credentialHash) returns (bool valid) {
                moduleVerified = valid;
            } catch {
                moduleVerified = false;
            }

            if (moduleVerified) {
                temporaryMatches[matchCount] = moduleId;
                matchCount += 1;
            }
        }

        matchedModules = new bytes32[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            matchedModules[i] = temporaryMatches[i];
        }

        verified = coreVerified || matchCount > 0;
    }
}