# Ecosystem Incentive Model

## Participant incentives

- Institutions:
  - Reputation badge tiers for historical integrity and governance participation.
  - Lower governance friction after sustained clean issuance behavior.
- Verifiers:
  - Optional reward allocations for high-quality verification contributions.
  - Trust score uplift for fraud reporting accuracy.
- Developers:
  - Public attribution and badge rewards for ecosystem SDK/module contributions.

## Economic alignment

- Issuers stake protocol tokens before eligibility.
- Confirmed malicious behavior triggers slashing and reputation penalties.
- Honest activity can accumulate reputation points via oracle or governance.

## Public trust scoring

Composite trust score suggestion:

- stake sufficiency score
- slash history penalty
- revocation anomaly penalty
- verification quality signals
- governance participation score

## Reputation NFT badges

- Contract: `VindicateReputationBadge.sol`
- Soulbound design (non-transferable) preserves identity-bound trust semantics.