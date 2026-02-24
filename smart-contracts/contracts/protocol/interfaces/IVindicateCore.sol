// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVindicateCore {
    struct CredentialView {
        uint256 credentialId;
        bytes32 credentialHash;
        address student;
        address issuer;
        uint64 issuedAt;
        bool revoked;
    }

    function verifyCredential(bytes32 credentialHash) external view returns (bool);

    function getCredentialIdByHash(bytes32 credentialHash) external view returns (uint256);

    function getCredentialById(uint256 credentialId) external view returns (CredentialView memory);

    function approveIssuer(address issuer) external;

    function removeIssuer(address issuer) external;

    function pauseIssuance() external;

    function unpauseIssuance() external;
}