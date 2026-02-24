# Disaster Recovery Playbook

## Targets
- RPO: 5 minutes
- RTO: 30 minutes

## Preconditions
- Access to Terraform state and Cloudflare controls.
- Access to database backup storage.
- Access to backend secrets and key-manager endpoints.

## Scenario A: Total Region Outage
1. Confirm primary region health is failing for at least 2 minutes.
2. Disable primary pool or force secondary preference.
3. Run `ops/disaster-recovery/validate-failover.sh`.
4. Scale secondary region deployment to surge profile.
5. Publish status update using `ops/incidents/statuspage-update.sh`.

## Scenario B: Database Corruption
1. Freeze write operations.
2. Restore latest verified dump with `ops/disaster-recovery/restore-postgres.sh`.
3. Run `npm run dr:resync:events` and `npm run dr:reindex:blockchain` in `backend`.
4. Verify `/health/ready` and `/health/slo`.
5. Re-enable writes.

## Scenario C: RPC Provider Failure
1. Verify primary RPC outage from backend logs.
2. Confirm fallback provider is active by checking request success rates.
3. Run `k6 run ops/performance/rpc-fallback-stress.k6.js` to validate stability.
4. Escalate if fallback error rate exceeds 2%.

## Scenario D: IPFS Provider Shutdown
1. Confirm failed pins/fetches in logs.
2. Keep issuance running only if backup IPFS quorum remains healthy.
3. Execute `npm run dr:repin:ipfs` in `backend`.
4. If pin quorum fails, temporarily disable issuance and keep verification in degraded mode.

## Post-Recovery Validation
- Health endpoints green in both regions.
- Verification and issuance SLO counters stable.
- Audit log chain intact (`audit-state.json` advances).
- Incident timeline and root-cause notes captured.