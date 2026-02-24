# Cryptographic Migration Plan

## Objective

Ensure credential verification remains trustworthy across algorithm, chain, and storage transitions without invalidating historical credentials.

## Cryptographic Agility Framework

### Design rules

- Separate credential semantics from proof algorithms.
- Store algorithm metadata with every proof and status artifact.
- Support multiple active signature suites at the same time.
- Require algorithm lifecycle states: `candidate`, `approved`, `deprecated`, `disabled`.

### Governance controls

- Algorithm promotion to `approved` requires independent cryptanalysis review and implementation audit.
- Algorithm deprecation requires a published migration window and backward verification support period.
- Emergency disable is allowed only for critical break scenarios and must be reviewable post-event.

## Post-Quantum Migration Pathway

| Stage | Target Window | Operational State | Required Outcome |
| --- | --- | --- | --- |
| PQ-0 Preparation | 2026-2028 | Inventory and test vectors for all cryptographic dependencies | Complete full dependency map and migration risk score |
| PQ-1 Dual-Signature Introduction | 2029-2032 | New credentials include classical + post-quantum compatible proofs | Production dual-verification support for all core APIs |
| PQ-2 Default Shift | 2033-2036 | Post-quantum suites become default for issuance and governance signatures | Greater than 80% of active issuance uses PQ-default profiles |
| PQ-3 Legacy Containment | 2037-2040 | Legacy signature suites restricted to historical verification only | Legacy issuance disabled while old credentials remain verifiable |

## Cryptographic Migration Mechanics

1. Publish migration profile versions with explicit allowed algorithm suites.
2. Introduce dual-signature issuance for a minimum overlap period.
3. Verify dual proof consistency before switching defaults.
4. Freeze new legacy issuance after governance-approved sunset date.
5. Keep historical verification adapters until archival sunset criteria are met.

## Blockchain Obsolescence Strategy

- Keep chain-specific anchoring behind a stable chain-abstraction interface.
- Maintain canonical protocol receipts independent of any single chain runtime.
- Support anchor portability: ability to re-anchor state commitments on successor chains.
- Require periodic chain health scoring and exit-readiness assessment.

## Multi-Chain Adaptability Policy

- Minimum two production-grade anchor networks at all times.
- No governance-critical dependency on a single chain or bridge provider.
- Cross-chain finality policy: confirmation thresholds vary by risk class.
- Chain retirement process includes replay-protection and proof continuity checks.

## Storage Evolution Strategy

- Use content-addressed objects with deterministic canonicalization.
- Maintain multi-provider storage replication with periodic integrity audits.
- Preserve migration adapters from legacy storage CIDs to successor formats.
- Archive critical state snapshots to long-retention storage networks.

## Protocol Upgrade Governance Safeguards

- Two-step upgrade approval for cryptographic or chain-critical changes.
- Mandatory external review period before activation.
- Rollback-safe release design with pre-committed recovery checkpoints.
- Post-upgrade incident review required for all major migrations.

## Versioning Philosophy

- Constitutional versioning:
  - Major version: changes to invariant-impacting behavior, requires constitutional quorum.
  - Minor version: additive capability and migration tooling.
  - Patch version: non-behavioral fixes, security hardening, implementation corrections.
- Backward verification is treated as a constitutional responsibility.
- Deprecation calendars are announced with explicit absolute dates and support horizons.

## Success Criteria

- Historical credentials remain verifiable through every major cryptographic transition.
- No critical service outage caused by algorithm migration.
- Migration pathways are auditable and reproducible by independent verifier implementations.