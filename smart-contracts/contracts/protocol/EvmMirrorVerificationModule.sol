// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IVindicateCore.sol";
import "./interfaces/IVindicateVerificationModule.sol";

/// @title EvmMirrorVerificationModule
/// @notice Example modular extension that verifies against an external EVM-compatible core contract.
contract EvmMirrorVerificationModule is AccessControl, IVindicateVerificationModule {
    bytes32 public constant MODULE_ADMIN_ROLE = keccak256("MODULE_ADMIN_ROLE");

    string private _name;
    string private _version;
    address public sourceCore;

    event SourceCoreUpdated(address indexed previousCore, address indexed newCore);
    event ModuleMetadataUpdated(string name, string version);

    error InvalidAddress();

    constructor(
        address admin,
        address initialSourceCore,
        string memory name_,
        string memory version_
    ) {
        if (admin == address(0) || initialSourceCore == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MODULE_ADMIN_ROLE, admin);

        sourceCore = initialSourceCore;
        _name = name_;
        _version = version_;
    }

    function moduleName() external view override returns (string memory) {
        return _name;
    }

    function moduleVersion() external view override returns (string memory) {
        return _version;
    }

    function setSourceCore(address newSourceCore) external onlyRole(MODULE_ADMIN_ROLE) {
        if (newSourceCore == address(0)) {
            revert InvalidAddress();
        }

        address previous = sourceCore;
        sourceCore = newSourceCore;
        emit SourceCoreUpdated(previous, newSourceCore);
    }

    function setMetadata(string calldata name_, string calldata version_) external onlyRole(MODULE_ADMIN_ROLE) {
        _name = name_;
        _version = version_;
        emit ModuleMetadataUpdated(name_, version_);
    }

    function verifyCredential(bytes32 credentialHash) external view override returns (bool) {
        if (sourceCore == address(0) || credentialHash == bytes32(0)) {
            return false;
        }

        try IVindicateCore(sourceCore).verifyCredential(credentialHash) returns (bool verified) {
            return verified;
        } catch {
            return false;
        }
    }
}