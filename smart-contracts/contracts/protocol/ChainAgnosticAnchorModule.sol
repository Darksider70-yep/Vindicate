// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IVindicateVerificationModule.sol";

/// @title ChainAgnosticAnchorModule
/// @notice Verification module that tracks credential anchors reported from external chains.
contract ChainAgnosticAnchorModule is AccessControl, IVindicateVerificationModule {
    bytes32 public constant ANCHOR_ORACLE_ROLE = keccak256("ANCHOR_ORACLE_ROLE");

    struct AnchorRecord {
        bool anchored;
        bool revoked;
        uint64 anchoredAt;
        bytes32 sourceTx;
    }

    string private constant MODULE_NAME = "ChainAgnosticAnchorModule";
    string private constant MODULE_VERSION = "1.0.0";

    mapping(bytes32 => mapping(bytes32 => AnchorRecord)) public anchorsByChainAndHash;
    mapping(bytes32 => bool) public chainRegistered;
    bytes32[] private _chainKeys;

    event AnchorUpserted(bytes32 indexed chainKey, bytes32 indexed credentialHash, bool revoked, bytes32 sourceTx);

    constructor(address admin, address anchorOracle) {
        require(admin != address(0) && anchorOracle != address(0), "INVALID_ROLE_ADDRESS");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ANCHOR_ORACLE_ROLE, anchorOracle);
    }

    function moduleName() external pure override returns (string memory) {
        return MODULE_NAME;
    }

    function moduleVersion() external pure override returns (string memory) {
        return MODULE_VERSION;
    }

    function chainKeys() external view returns (bytes32[] memory) {
        return _chainKeys;
    }

    function upsertAnchor(
        bytes32 chainKey,
        bytes32 credentialHash,
        bool revoked,
        bytes32 sourceTx
    ) external onlyRole(ANCHOR_ORACLE_ROLE) {
        require(chainKey != bytes32(0) && credentialHash != bytes32(0), "INVALID_INPUT");

        if (!chainRegistered[chainKey]) {
            chainRegistered[chainKey] = true;
            _chainKeys.push(chainKey);
        }

        anchorsByChainAndHash[chainKey][credentialHash] = AnchorRecord({
            anchored: true,
            revoked: revoked,
            anchoredAt: uint64(block.timestamp),
            sourceTx: sourceTx
        });

        emit AnchorUpserted(chainKey, credentialHash, revoked, sourceTx);
    }

    function verifyCredential(bytes32 credentialHash) external view override returns (bool) {
        if (credentialHash == bytes32(0)) {
            return false;
        }

        uint256 length = _chainKeys.length;
        for (uint256 i = 0; i < length; i++) {
            bytes32 chainKey = _chainKeys[i];
            AnchorRecord memory record = anchorsByChainAndHash[chainKey][credentialHash];
            if (record.anchored && !record.revoked) {
                return true;
            }
        }

        return false;
    }

    function verifyCredentialOnChain(bytes32 chainKey, bytes32 credentialHash) external view returns (bool) {
        AnchorRecord memory record = anchorsByChainAndHash[chainKey][credentialHash];
        return record.anchored && !record.revoked;
    }
}