# Performance Hardening Toolkit

## Objective
Validate service stability under 10x verification traffic, burst issuance, and partial infrastructure failures.

## Test suites
- Verification load (10x): `k6 run ops/performance/verify-load.k6.js`
- Issuance burst: `k6 run ops/performance/issuance-burst.k6.js`
- RPC fallback stress: `k6 run ops/performance/rpc-fallback-stress.k6.js`

## Failure simulation
- DNS failover drill: `ops/performance/simulate-failover.sh`
- IPFS outage simulation: `ops/performance/chaos-ipfs-outage.sh`
- Scenario catalog: `ops/performance/chaos-scenarios.yml`

## Success criteria
- Verification p95 latency <= 1200 ms
- Issuance p95 latency <= 8000 ms
- 5xx rate <= 2%
- Regional failover recovery <= 30 minutes