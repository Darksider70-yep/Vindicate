# Treasury and Funding Model

## Treasury Structure

Core contract: `VindicateTreasury.sol`

Fee routing configuration (basis points):

- Rewards pool: 35.0%
- Grants pool: 20.0%
- Insurance reserve: 20.0%
- Operations reserve: 20.0%
- Burn sink: 5.0%

## Protocol Fee Model

Recommended fee rails:

- Credential issuance fee: fixed base + dynamic congestion component
- Verification fee: micro-fee for enterprise/API-tier usage
- Optional premium features: advanced analytics, compliance attestations

## Distribution Logic

- Rewards funds verifiers, institutions, and ecosystem contribution payouts.
- Grants fund SDK integrations, ecosystem tooling, and protocol extensions.
- Insurance absorbs dispute/slashing externalities and black swan incidents.
- Operations extends runway for security audits, infra, and core maintenance.
- Burn introduces long-term deflation pressure to counter emissions.

## Grant Program Design

- Milestone-locked releases via DAO governance.
- Required post-grant KPI reporting.
- Clawback or suspension rights for non-delivery.

## Bear Market Survival Strategy

- Maintain 24+ month operations reserve runway target.
- Automatically reduce discretionary grants when runway threshold is breached.
- Preserve security-critical spending before growth subsidies.

## Anti-Speculation Sustainability

- Revenue-backed utility demand through issuance and verification usage.
- Controlled emission gates tied to real protocol activity.
- Staking and slashing mechanics create productive, not purely speculative, token demand.