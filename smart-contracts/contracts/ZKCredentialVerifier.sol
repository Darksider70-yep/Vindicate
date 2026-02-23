// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ZKCredentialVerifier
/// @notice Verifier stub contract for challenge-bound credential proofs.
/// @dev Stores challenge and nullifier state to prevent proof replay.
contract ZKCredentialVerifier is AccessControl, Pausable {
    bytes32 public constant CHALLENGE_MANAGER_ROLE = keccak256("CHALLENGE_MANAGER_ROLE");
    bytes32 public constant PROVER_ROLE = keccak256("PROVER_ROLE");

    struct Challenge {
        uint64 expiresAt;
        bool active;
    }

    mapping(bytes32 => Challenge) private _challenges;
    mapping(bytes32 => bool) private _usedNullifiers;

    error ZeroAddressAdmin();
    error ZeroHashChallenge();
    error ZeroHashNullifier();
    error ChallengeAlreadyRegistered(bytes32 challengeHash);
    error ChallengeNotActive(bytes32 challengeHash);
    error ChallengeExpired(bytes32 challengeHash);
    error NullifierAlreadyUsed(bytes32 nullifierHash);
    error ChallengeSignalMismatch(bytes32 challengeHash);
    error InvalidProof();

    event ChallengeRegistered(bytes32 indexed challengeHash, uint64 expiresAt, address indexed manager);
    event ChallengeCancelled(bytes32 indexed challengeHash, address indexed manager);
    event ProofVerified(
        bytes32 indexed challengeHash,
        bytes32 indexed nullifierHash,
        address indexed prover,
        uint256 timestamp
    );

    /// @param admin The account granted admin and manager roles.
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddressAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CHALLENGE_MANAGER_ROLE, admin);
        _grantRole(PROVER_ROLE, admin);
    }

    /// @notice Registers a proof challenge that expires at `expiresAt`.
    /// @param challengeHash Challenge digest shared with the proof circuit/public inputs.
    /// @param expiresAt Expiration timestamp in seconds.
    function registerChallenge(
        bytes32 challengeHash,
        uint64 expiresAt
    ) external onlyRole(CHALLENGE_MANAGER_ROLE) {
        if (challengeHash == bytes32(0)) revert ZeroHashChallenge();
        if (_challenges[challengeHash].active) revert ChallengeAlreadyRegistered(challengeHash);

        _challenges[challengeHash] = Challenge({
            expiresAt: expiresAt,
            active: true
        });

        emit ChallengeRegistered(challengeHash, expiresAt, _msgSender());
    }

    /// @notice Cancels an active challenge.
    /// @param challengeHash Challenge to cancel.
    function cancelChallenge(bytes32 challengeHash) external onlyRole(CHALLENGE_MANAGER_ROLE) {
        Challenge storage challenge = _challenges[challengeHash];
        if (!challenge.active) revert ChallengeNotActive(challengeHash);

        challenge.active = false;
        emit ChallengeCancelled(challengeHash, _msgSender());
    }

    /// @notice Verifies and consumes a challenge-bound proof.
    /// @param challengeHash Challenge hash expected in public signals.
    /// @param nullifierHash Unique nullifier used to prevent replay.
    /// @param proof Encoded proof bytes (verifier-specific format).
    /// @param publicSignals Public signals associated with the proof.
    /// @return verified True when the proof is accepted and state updated.
    function verifyProof(
        bytes32 challengeHash,
        bytes32 nullifierHash,
        bytes calldata proof,
        bytes32[] calldata publicSignals
    ) external whenNotPaused onlyRole(PROVER_ROLE) returns (bool verified) {
        if (challengeHash == bytes32(0)) revert ZeroHashChallenge();
        if (nullifierHash == bytes32(0)) revert ZeroHashNullifier();

        Challenge storage challenge = _challenges[challengeHash];
        if (!challenge.active) revert ChallengeNotActive(challengeHash);
        if (challenge.expiresAt != 0 && challenge.expiresAt < uint64(block.timestamp)) {
            challenge.active = false;
            revert ChallengeExpired(challengeHash);
        }
        if (_usedNullifiers[nullifierHash]) revert NullifierAlreadyUsed(nullifierHash);

        if (publicSignals.length == 0 || publicSignals[0] != challengeHash) {
            revert ChallengeSignalMismatch(challengeHash);
        }

        if (!_verifyProof(proof, publicSignals)) revert InvalidProof();

        challenge.active = false;
        _usedNullifiers[nullifierHash] = true;

        emit ProofVerified(challengeHash, nullifierHash, _msgSender(), block.timestamp);
        return true;
    }

    /// @notice Indicates whether a challenge is currently active.
    /// @param challengeHash Challenge hash.
    /// @return isActive True when challenge exists and is active.
    function isChallengeActive(bytes32 challengeHash) external view returns (bool isActive) {
        return _challenges[challengeHash].active;
    }

    /// @notice Returns challenge metadata.
    /// @param challengeHash Challenge hash.
    /// @return expiresAt Expiration timestamp.
    /// @return active Current challenge active status.
    function getChallenge(bytes32 challengeHash) external view returns (uint64 expiresAt, bool active) {
        Challenge memory challenge = _challenges[challengeHash];
        return (challenge.expiresAt, challenge.active);
    }

    /// @notice Indicates whether a nullifier has already been consumed.
    /// @param nullifierHash Nullifier hash.
    /// @return used True when nullifier was used in a successful proof submission.
    function isNullifierUsed(bytes32 nullifierHash) external view returns (bool used) {
        return _usedNullifiers[nullifierHash];
    }

    /// @notice Pauses proof verification.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses proof verification.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @dev Stub verifier hook. Override in derived contract for circuit-specific verification.
    function _verifyProof(
        bytes calldata proof,
        bytes32[] calldata publicSignals
    ) internal pure virtual returns (bool) {
        return proof.length > 0 && publicSignals.length > 0;
    }
}
