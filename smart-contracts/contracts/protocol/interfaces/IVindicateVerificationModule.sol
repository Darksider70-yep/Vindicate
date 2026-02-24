// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVindicateVerificationModule {
    function moduleName() external view returns (string memory);

    function moduleVersion() external view returns (string memory);

    function verifyCredential(bytes32 credentialHash) external view returns (bool);
}