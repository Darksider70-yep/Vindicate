# Decentralized Storage Redundancy (Phase 8)

## Baseline

- Multi-provider IPFS pinning remains mandatory (primary + backup nodes).
- CID and hash integrity checks remain canonical acceptance criteria.

## Extended redundancy strategy

- Optional Arweave anchoring for permanent archival references.
- Dual-write policy option:
  - write payload to IPFS
  - write immutable archive pointer to Arweave
  - store both references in metadata layer

## Redundancy incentive model

- Provider quality score tracks uptime, pin success, and fetch latency.
- Governance can route storage incentives toward high-availability providers.
- Slashing-like penalties can apply to bonded archival relayers for provable failures.

## Operational controls

- Scheduled repin reconciliation (`npm run dr:repin:ipfs`).
- Provider outage simulation drills (`ops/performance/chaos-ipfs-outage.sh`).
- Storage health indicators exported into monitoring stack.