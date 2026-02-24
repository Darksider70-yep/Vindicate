// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceVotingPower {
    function governanceWeight(address account) external view returns (uint256);

    function totalGovernanceWeight() external view returns (uint256);
}