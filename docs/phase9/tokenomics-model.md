# Token Economy Design

## Native Token Definition

- Token: `VGT` (Vindicate Governance Token)
- Primary utility:
  - DAO governance voting
  - Issuer staking and bonding
  - Slashing collateral base
  - Protocol fee settlement and treasury flows
  - Optional verification and ecosystem rewards

## Supply and Allocation

- Genesis supply: 1,000,000,000 VGT
- Allocation plan (from `tokenomics-model.json`):
  - 30.0% ecosystem rewards
  - 18.0% institution and issuer bootstrap
  - 17.0% DAO treasury reserve
  - 15.0% core contributors
  - 10.0% investors
  - 7.0% developer grants
  - 3.0% liquidity bootstrap

## Emission Model

Hybrid model:

- Fixed genesis supply at launch
- Governance-gated tail emissions with strict caps:
  - Years 1-5: up to 2.0% annual
  - Years 6-10: up to 1.0% annual
  - Year 10+: up to 0.5% annual

Emissions are only activated when adoption/security metrics pass thresholds.

## Inflation and Deflation

- Inflation control:
  - Hard annual cap by epoch
  - DAO vote required for mint schedule activation
- Deflation mechanisms:
  - 5.0% of protocol fees routed to burn sink
  - Conditional buyback-and-burn from surplus treasury periods

## Vesting Structure

- Core contributors: 12-month cliff, 4-year linear vesting
- Investors: 12-month cliff, 3-year linear vesting
- Ecosystem rewards: 10-year streaming release
- Grants and bootstrap pools: milestone and governance-gated release

Enforced by: `VindicateVestingVault.sol`.

## Issuer Bonding Requirement

- Minimum issuer stake target: 10,000 VGT
- Cooldown on unstake: 14 days (governance adjustable)
- Approved issuer status requires minimum active stake

## Tradeoffs

### Fixed supply vs inflationary
- Fixed-only improves scarcity predictability but can underfund security incentives in growth phases.
- Controlled inflation supports security and growth subsidies but needs strict governance constraints.

### Utility token vs governance-only
- Governance-only can weaken real protocol demand.
- Utility+governance aligns activity with token demand but increases economic complexity.

### Speculation risk
- Mitigations:
  - long vesting cliffs
  - non-transferable reputation rails
  - utility-linked fee demand
  - emission activation tied to real usage metrics