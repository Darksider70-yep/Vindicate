# Vindicate Change Proposal (VCPR) Process

## Proposal categories

- `Core`: protocol contract behavior or state-transition changes
- `Governance`: DAO thresholds, quorum, timelock, role policy updates
- `Interoperability`: new chain modules, bridge adapter changes
- `Compliance`: audit/event schema and retention policy changes

## Required proposal metadata

- `title`
- `descriptionHash`
- `riskLevel`
- `backwardCompatibilityImpact`
- `rolloutPlan`
- `monitoringPlan`

## Process

1. Author drafts proposal in protocol docs and links implementation diff.
2. Proposal is submitted on-chain using governor contract.
3. Community review runs during voting delay.
4. Voting executes during active period.
5. If successful, proposal enters timelock queue.
6. Authorized executor executes after timelock.
7. Post-execution validation and release notes are published.

## Emergency process

- Emergency pause proposals can be fast-tracked only by pre-defined governance settings.
- All emergency actions still require on-chain traceability.