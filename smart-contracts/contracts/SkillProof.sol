// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title SkillProof
/// @notice Upgradeable credential registry for issuance, revocation, and verification by hash.
/// @dev Uses UUPS upgradeability, RBAC via AccessControl, pausable issuance, and custom errors.
contract SkillProof is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant INSTITUTION_ADMIN_ROLE = keccak256("INSTITUTION_ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    /// @dev Packed to minimize storage writes while preserving required fields.
    struct Credential {
        uint256 credentialId;
        bytes32 credentialHash;
        address student;
        address issuer;
        uint64 issuedAt;
        bool revoked;
    }

    uint256 private _nextCredentialId;

    mapping(uint256 => Credential) private _credentialsById;
    mapping(bytes32 => uint256) private _credentialIdByHash;
    mapping(address => uint256[]) private _studentCredentialIds;

    error ZeroAddressStudent();
    error ZeroAddressAccount();
    error ZeroCredentialHash();
    error DuplicateCredentialHash(bytes32 credentialHash);
    error CredentialNotFound(uint256 credentialId);
    error CredentialAlreadyRevoked(uint256 credentialId);
    error CallerNotAdmin(address caller);
    error CallerNotIssuer(address caller);
    error CallerNotInstitutionAdminOrAdmin(address caller);
    error UnauthorizedRevoker(address caller);
    error IssuerAlreadyApproved(address issuer);
    error IssuerNotApproved(address issuer);
    error UseIssuerApprovalFlow();

    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed student,
        address indexed issuer,
        bytes32 credentialHash,
        uint64 issuedAt
    );
    event CredentialRevoked(
        uint256 indexed credentialId,
        address indexed revokedBy,
        bytes32 credentialHash,
        uint64 revokedAt
    );
    event IssuerApproved(address indexed issuer, address indexed approvedBy);
    event IssuerRemoved(address indexed issuer, address indexed removedBy);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract and role hierarchy.
    /// @param defaultAdmin Address granted DEFAULT_ADMIN_ROLE.
    /// @param institutionAdmin Address granted INSTITUTION_ADMIN_ROLE.
    function initialize(address defaultAdmin, address institutionAdmin) external initializer {
        _validateNonZeroAccount(defaultAdmin);
        _validateNonZeroAccount(institutionAdmin);

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(INSTITUTION_ADMIN_ROLE, institutionAdmin);

        _setRoleAdmin(INSTITUTION_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ISSUER_ROLE, INSTITUTION_ADMIN_ROLE);

        _nextCredentialId = 1;
    }

    /// @notice Restricts UUPS upgrades to DEFAULT_ADMIN_ROLE.
    /// @param newImplementation Address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal view override onlyAdmin {
        _validateNonZeroAccount(newImplementation);
    }

    /// @notice Prevents direct issuer grants outside approval flow.
    /// @param role Role identifier to grant.
    /// @param account Account to receive the role.
    function grantRole(bytes32 role, address account) public override {
        if (role == ISSUER_ROLE) revert UseIssuerApprovalFlow();
        super.grantRole(role, account);
    }

    /// @notice Prevents direct issuer revokes outside removal flow.
    /// @param role Role identifier to revoke.
    /// @param account Account to lose the role.
    function revokeRole(bytes32 role, address account) public override {
        if (role == ISSUER_ROLE) revert UseIssuerApprovalFlow();
        super.revokeRole(role, account);
    }

    /// @notice Allows an issuer to self-renounce and emits IssuerRemoved.
    /// @param role Role identifier to renounce.
    /// @param callerConfirmation Must equal msg.sender.
    function renounceRole(bytes32 role, address callerConfirmation) public override {
        bool wasIssuer = role == ISSUER_ROLE && hasRole(ISSUER_ROLE, callerConfirmation);
        super.renounceRole(role, callerConfirmation);
        if (wasIssuer) {
            emit IssuerRemoved(callerConfirmation, _msgSender());
        }
    }

    /// @notice Approves an issuer account.
    /// @param issuer Address to grant ISSUER_ROLE.
    function approveIssuer(address issuer) external onlyInstitutionAdminOrAdmin {
        _validateNonZeroAccount(issuer);
        if (hasRole(ISSUER_ROLE, issuer)) revert IssuerAlreadyApproved(issuer);

        _grantRole(ISSUER_ROLE, issuer);
        emit IssuerApproved(issuer, _msgSender());
    }

    /// @notice Removes an issuer account.
    /// @param issuer Address to revoke ISSUER_ROLE from.
    function removeIssuer(address issuer) external onlyInstitutionAdminOrAdmin {
        _validateNonZeroAccount(issuer);
        if (!hasRole(ISSUER_ROLE, issuer)) revert IssuerNotApproved(issuer);

        _revokeRole(ISSUER_ROLE, issuer);
        emit IssuerRemoved(issuer, _msgSender());
    }

    /// @notice Issues a new credential to a student.
    /// @dev Credential hash must be globally unique and non-zero.
    /// @param student Student wallet address.
    /// @param credentialHash Hash of canonicalized credential payload.
    /// @return credentialId Newly created incremental credential identifier.
    function issueCredential(
        address student,
        bytes32 credentialHash
    ) external onlyIssuer whenNotPaused nonReentrant returns (uint256 credentialId) {
        _validateIssueInputs(student, credentialHash);

        if (_credentialIdByHash[credentialHash] != 0) revert DuplicateCredentialHash(credentialHash);

        credentialId = _nextCredentialId;
        unchecked {
            _nextCredentialId = credentialId + 1;
        }

        uint64 issuedAt = uint64(block.timestamp);
        address issuer = _msgSender();

        Credential storage credential = _credentialsById[credentialId];
        credential.credentialId = credentialId;
        credential.student = student;
        credential.issuer = issuer;
        credential.credentialHash = credentialHash;
        credential.issuedAt = issuedAt;
        credential.revoked = false;

        _credentialIdByHash[credentialHash] = credentialId;
        _studentCredentialIds[student].push(credentialId);

        emit CredentialIssued(credentialId, student, issuer, credentialHash, issuedAt);
    }

    /// @notice Revokes an existing credential.
    /// @dev Callable by original issuer, institution admin, or default admin.
    /// @param credentialId Credential identifier to revoke.
    function revokeCredential(uint256 credentialId) external nonReentrant {
        Credential storage credential = _getCredentialStorage(credentialId);
        if (credential.revoked) revert CredentialAlreadyRevoked(credentialId);

        address caller = _msgSender();
        if (!_canRevoke(caller, credential.issuer)) revert UnauthorizedRevoker(caller);

        credential.revoked = true;
        emit CredentialRevoked(credentialId, caller, credential.credentialHash, uint64(block.timestamp));
    }

    /// @notice Verifies whether a credential hash exists and is active.
    /// @param credentialHash Hash to verify.
    /// @return isValid True if hash exists and credential is not revoked.
    function verifyCredential(bytes32 credentialHash) external view returns (bool isValid) {
        if (credentialHash == bytes32(0)) revert ZeroCredentialHash();

        uint256 credentialId = _credentialIdByHash[credentialHash];
        if (credentialId == 0) return false;

        return !_credentialsById[credentialId].revoked;
    }

    /// @notice Gets credential data by credential ID.
    /// @param credentialId Credential identifier.
    /// @return credential Credential struct for the requested ID.
    function getCredentialById(uint256 credentialId) external view returns (Credential memory credential) {
        credential = _credentialsById[credentialId];
        if (credential.credentialId == 0) revert CredentialNotFound(credentialId);
    }

    /// @notice Returns all credential IDs issued for a student.
    /// @param student Student address.
    /// @return credentialIds List of credential IDs associated with the student.
    function getCredentialsByStudent(address student) external view returns (uint256[] memory credentialIds) {
        if (student == address(0)) revert ZeroAddressStudent();
        return _studentCredentialIds[student];
    }

    /// @notice Returns the count of credentials for a student.
    /// @param student Student address.
    /// @return count Number of credentials associated with the student.
    function getCredentialCountByStudent(address student) external view returns (uint256 count) {
        if (student == address(0)) revert ZeroAddressStudent();
        return _studentCredentialIds[student].length;
    }

    /// @notice Returns credential existence by hash.
    /// @param credentialHash Hash to check.
    /// @return exists True if a credential has already been issued for hash.
    function credentialExists(bytes32 credentialHash) public view returns (bool exists) {
        if (credentialHash == bytes32(0)) return false;
        return _credentialIdByHash[credentialHash] != 0;
    }

    /// @notice Returns credential existence by ID.
    /// @param credentialId Credential identifier.
    /// @return exists True if credentialId is assigned.
    function credentialExistsById(uint256 credentialId) external view returns (bool exists) {
        return _credentialsById[credentialId].credentialId != 0;
    }

    /// @notice Gets credential ID for a hash.
    /// @param credentialHash Hash to resolve.
    /// @return credentialId Credential ID mapped to the hash, or 0 if missing.
    function getCredentialIdByHash(bytes32 credentialHash) external view returns (uint256 credentialId) {
        return _credentialIdByHash[credentialHash];
    }

    /// @notice Returns whether an account has DEFAULT_ADMIN_ROLE.
    /// @param account Address to check.
    /// @return True if account is default admin.
    function isDefaultAdmin(address account) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @notice Returns whether an account has INSTITUTION_ADMIN_ROLE.
    /// @param account Address to check.
    /// @return True if account is institution admin.
    function isInstitutionAdmin(address account) external view returns (bool) {
        return hasRole(INSTITUTION_ADMIN_ROLE, account);
    }

    /// @notice Returns whether an account has ISSUER_ROLE.
    /// @param account Address to check.
    /// @return True if account is an approved issuer.
    function isIssuer(address account) external view returns (bool) {
        return hasRole(ISSUER_ROLE, account);
    }

    /// @notice Returns current contract pause state.
    /// @return True when issuance is paused.
    function isPaused() external view returns (bool) {
        return paused();
    }

    /// @notice Pauses issuance operations.
    function pauseIssuance() external onlyAdmin {
        _pause();
    }

    /// @notice Unpauses issuance operations.
    function unpauseIssuance() external onlyAdmin {
        _unpause();
    }

    /// @notice Returns the next credential ID that will be assigned.
    /// @return nextId Next incremental credential ID.
    function nextCredentialId() external view returns (uint256 nextId) {
        return _nextCredentialId;
    }

    /// @inheritdoc AccessControlUpgradeable
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    modifier onlyAdmin() {
        address sender = _msgSender();
        if (!hasRole(DEFAULT_ADMIN_ROLE, sender)) revert CallerNotAdmin(sender);
        _;
    }

    modifier onlyIssuer() {
        address sender = _msgSender();
        if (!hasRole(ISSUER_ROLE, sender)) revert CallerNotIssuer(sender);
        _;
    }

    modifier onlyInstitutionAdminOrAdmin() {
        address sender = _msgSender();
        if (!_isInstitutionAdminOrAdmin(sender)) revert CallerNotInstitutionAdminOrAdmin(sender);
        _;
    }

    function _validateIssueInputs(address student, bytes32 credentialHash) internal pure {
        if (student == address(0)) revert ZeroAddressStudent();
        if (credentialHash == bytes32(0)) revert ZeroCredentialHash();
    }

    function _validateNonZeroAccount(address account) internal pure {
        if (account == address(0)) revert ZeroAddressAccount();
    }

    function _canRevoke(address caller, address issuer) internal view returns (bool) {
        return caller == issuer || _isInstitutionAdminOrAdmin(caller);
    }

    function _isInstitutionAdminOrAdmin(address account) internal view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account) || hasRole(INSTITUTION_ADMIN_ROLE, account);
    }

    function _getCredentialStorage(uint256 credentialId) internal view returns (Credential storage credential) {
        credential = _credentialsById[credentialId];
        if (credential.credentialId == 0) revert CredentialNotFound(credentialId);
    }

    uint256[50] private __gap;
}
