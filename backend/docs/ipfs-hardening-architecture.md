# Vindicate Phase 3 Storage Architecture

## 1. Storage Strategy
- Primary provider: `IPFS_PRIMARY_API_URL` (managed endpoint; Infura-compatible).
- Backup providers: `IPFS_BACKUP_API_URLS` (comma-separated managed/self-hosted gateways).
- Backup pinning: optional Pinata (`PINATA_JWT`) via `pinByHash`.
- Redundancy policy: at least `IPFS_MIN_PIN_REPLICAS` successful pins per issuance.
- CID policy: CIDv1 enforced (`multiformats/CID.parse(...).version === 1`).

## 2. Tradeoffs
- Public IPFS:
  - Pros: globally resolvable, stronger decentralization.
  - Cons: metadata visibility; unsuitable for sensitive plaintext.
- Private/encrypted payloads on public IPFS:
  - Pros: preserves integrity and availability while hiding payload.
  - Cons: key management complexity.
- Self-hosted node:
  - Pros: highest control and retention guarantees.
  - Cons: operational overhead, uptime burden.
- Managed services:
  - Pros: faster ops, global infra, support SLAs.
  - Cons: vendor lock-in risk; mitigated with multi-provider pinning.

## 3. Integrity Guarantees
- Deterministic `sha256(file bytes)` used as:
  - `file_checksum` (hex)
  - `credential_hash` (`0x` + checksum) committed on-chain.
- IPFS flow:
  1. derive expected checksum/hash
  2. upload bytes (or encrypted bytes)
  3. receive CIDv1 from multiple nodes
  4. fetch and recompute CID (`onlyHash`) + checksum + credential hash
  5. only commit hash on-chain if all checks pass.

## 4. Encryption Model
- Optional AES-256-GCM payload encryption before upload.
- Random data key (DEK) per credential.
- DEK wrapped with environment KEK (`IPFS_ENCRYPTION_KEY`) and stored in `credential_keys`.
- Keys are never written on-chain.

## 5. Recovery Policy
- If IPFS fails: fallback to backup nodes and gateway.
- If chain commit fails after IPFS upload: CID unpinned (`best-effort` cleanup).
- If DB write fails after chain success: automatic on-chain revoke + unpin compensation.
- All compensation outcomes are included in structured error details.
