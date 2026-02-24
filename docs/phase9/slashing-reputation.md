# Slashing and Reputation Mechanism

## Economic Security Stack

- Issuer collateral and reputation live in `VindicateIssuerStaking.sol`.
- Slashing case adjudication and reporter bond flow in `VindicateSlashingCourt.sol`.
- Governance + adjudicator roles decide final slash outcomes after review windows.

## Slashing Logic Structure

1. Reporter opens slashing case with evidence hash and bond.
2. Case enters mandatory review window.
3. Adjudicator resolves case:
   - approved: slash executes on staking contract
   - rejected: reporter bond transferred to insurance treasury
4. Approved reporter can reclaim bond only after slash execution.

## Reputation Structure

- Positive reputation points increase governance weight multiplier.
- Negative events reduce reputation score.
- Slash history (`totalSlashed`) and issuer approval state remain on-chain.

## Fraud Detection Inputs

- Integrity mismatches (on-chain vs DB vs storage proofs)
- Revocation anomalies
- Issuance outlier behavior
- External verifier reports with cryptographic evidence references

## Anti-Abuse Controls

### False slashing attacks
- Reporter bond makes spam and bad-faith reporting costly.
- Adjudication window enables evidence review before execution.

### Collusion risk
- Split roles between reporter, adjudicator, governance, and slasher executor.
- On-chain evidence hashes and case history support external audit.

### Governance capture risk
- Timelock governance and hybrid voting (stake + reputation) reduce unilateral capture.
- Treasury insurance reserves absorb short-term dispute shocks.