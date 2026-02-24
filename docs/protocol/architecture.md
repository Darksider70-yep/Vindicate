# Vindicate Protocol Architecture (Phase 8)

## Layer Separation

- Protocol layer:
  - `SkillProof.sol` (core credential state and revocation)
  - `VindicateProtocolRegistry.sol` (core version + module registry)
  - Verification modules (`EvmMirrorVerificationModule.sol`, `ChainAgnosticAnchorModule.sol`)
- Governance layer:
  - `VindicateProtocolGovernor.sol` (proposals, voting, quorum, timelock execution)
  - `VindicateIssuerStaking.sol` (stake-backed governance weight + slashing)
  - `VindicateGovernanceToken.sol` (optional token voting)
- Application layer:
  - Backend API + frontend dashboards + SDK clients
  - Off-chain observability, compliance, and multi-region operations

## Protocol Diagram (Text)

```text
                        +-----------------------------------------+
                        |      Vindicate Protocol Registry         |
                        |  (core pointer + module activation map)  |
                        +--------------------+--------------------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
      +------------v-------------+                       +-------------v----------------+
      | SkillProof Core Contract |                       | Verification Modules          |
      | issue/revoke/verify      |                       | - EVM Mirror Module           |
      | issuer role checks       |                       | - Chain-Agnostic Anchor Mod   |
      +------------+-------------+                       +-------------+----------------+
                   |                                                   |
                   +----------------------+----------------------------+
                                          |
                            Permissionless Verification API
                                          |
                    +---------------------v----------------------+
                    | Backend + SDK + Third-Party Integrations   |
                    +---------------------+----------------------+
                                          |
                           +--------------v---------------+
                           | DAO Governance + Timelock    |
                           | Governor + Staking + Token   |
                           +------------------------------+
```

## Backward Compatibility Strategy

- `SkillProof` remains the canonical credential source.
- Protocol registry allows module introduction without replacing core contract interfaces.
- API keeps `/api` and `/api/v1` compatibility while protocol version is surfaced via `/api/v1/protocol/meta`.

## Upgrade Governance Control

- Core pointer updates and module changes are governance-authorized.
- Governor contract enforces voting quorum and timelock before execution.
- Emergency actions (pause proposal type) are explicit and auditable.

## Permissionless Verification Model

- Any user can query protocol verification (`verifyCredentialPermissionless`) without privileged credentials.
- Off-chain verifiers can consume the same outcome via SDK and OpenAPI endpoints.