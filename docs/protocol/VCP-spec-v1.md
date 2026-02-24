# Vindicate Credential Protocol (VCP) Specification v1.0.0

## 1. Scope

VCP defines interoperable credential hashing, anchoring, revocation, DID binding, and proof verification rules for the Vindicate ecosystem.

## 2. Credential Structure

A canonical credential payload MUST include:

- `credentialHash` (bytes32 hex)
- `issuerDid` (did:ethr identifier)
- `subjectDid` (did:ethr identifier)
- `issuedAt` (ISO-8601)
- `credentialSubject` (object)
- optional `expirationDate`

VC documents SHOULD include:

- `@context`
- `type`
- `credentialStatus`
- `evidence` with Merkle commitment root
- `proof` with issuer signature

## 3. Hashing Standard

- Canonical JSON serialization: deterministic key ordering
- Hash function: SHA-256
- Protocol hash format: `0x` + 32-byte digest
- File checksum and on-chain credential hash MUST map to the same digest domain

## 4. Revocation Logic

- Revocation source of truth is on-chain state in core protocol contract.
- Revoked credentials MUST fail verification regardless of off-chain metadata validity.
- Emergency override MAY blacklist and revoke concurrently.

## 5. DID Binding

- Issuer and subject identities MUST be bound to DID documents.
- DID ownership proofs MUST be verifiable via signed challenge-response.
- DID documents SHOULD be anchored via IPFS with hash integrity checks.

## 6. Proof Format

- VC proof format: `EcdsaSecp256k1RecoverySignature2020`
- Selective disclosure proof: Merkle leaf + sibling path + signed wrapper payload
- Optional ZK proofs MUST include challenge binding and freshness constraints

## 7. Interoperability Anchoring

- Native chain anchors: EVM skill-proof contracts.
- Extended chain anchors: chain-agnostic module attestations.
- Multi-chain verification result MUST report per-chain anchor state.

## 8. Versioning Policy

- Major: breaking data/proof semantic changes
- Minor: backward-compatible field additions or optional modules
- Patch: security or implementation corrections without semantic schema drift

Current version: `v1.0.0`

## 9. Change Proposal System

Protocol changes MUST follow governance proposal lifecycle:

1. Draft VCP change proposal
2. On-chain proposal submission
3. Quorum vote and timelock
4. Controlled execution and release notes publication

## 10. Compatibility Guarantees

- `SkillProof` core verification ABI remains stable for v1.x line.
- Registry-based module expansion MUST NOT break legacy verification calls.