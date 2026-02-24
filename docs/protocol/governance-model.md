# DAO Governance Model (Phase 8)

## Components

- Optional governance token: `VindicateGovernanceToken.sol`
- Reputation + stake voting power: `VindicateIssuerStaking.sol`
- Proposal, voting, timelock: `VindicateProtocolGovernor.sol`

## Proposal Types

- `GENERIC_CALL`: generic protocol parameter/action calls
- `ISSUER_APPROVAL`: DAO-approved issuer onboarding execution
- `EMERGENCY_PAUSE`: governance-triggered emergency pause
- `PARAMETER_CHANGE`: governed parameter updates with metadata key/value

## Lifecycle

1. Proposal creation (threshold voting power required)
2. Voting delay
3. Active voting window
4. Queue on success (quorum + majority)
5. Timelock wait
6. Execution by authorized executor role

## Quorum Rules

- Quorum stored per proposal at creation time
- `forVotes > againstVotes`
- `forVotes >= quorumSnapshot`

## Tradeoffs

### Token-based governance
- Advantages: simple, liquid participation, transparent stake economics
- Risks: whale capture, vote buying, passive concentration

### Reputation-based governance
- Advantages: ties governance power to verifiable ecosystem behavior
- Risks: reputation oracle capture, slower onboarding

### Hybrid governance
- Advantages: combines economic skin-in-the-game with behavior-based credibility
- Risks: model complexity and calibration burden

## Sybil Resistance

- Issuer stake requirements increase cost of fake identities.
- Reputation scores and slash history reduce impact of throwaway accounts.
- Timelock and guardian controls add containment windows for malicious proposals.