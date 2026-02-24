# API Governance Policy

## Versioning
- Current version: `v1`
- Canonical path prefix: `/api/v1`
- Legacy `/api` remains temporarily with deprecation headers.

## Deprecation lifecycle
1. Announce deprecation and publish migration guidance.
2. Emit `deprecation: true`, `sunset`, and policy `link` headers on legacy paths.
3. Enforce sunset date (`API_V0_SUNSET_AT`) and remove legacy routing after cutoff.

## Client authentication and metering
- API keys delivered in `x-api-key` by default.
- Per-client usage telemetry recorded to `API_USAGE_LOG_PATH`.
- Tier limits sourced from `API_TIER_LIMITS_JSON`.

## Key rotation
- Super-admin endpoint rotates and revokes active keys:
  - `POST /api/v1/admin/api-governance/clients/:clientId/keys/rotate`
- Rotation response returns one-time plaintext key for secure secret storage.

## Tier policy defaults
- `internal`: 1000 req/min
- `partner`: 300 req/min
- `public`: 120 req/min

## Enforcement
- API key validation middleware resolves client identity.
- Tier-aware rate limiter applies request ceilings.
- Usage records support per-client quota reporting and abuse investigations.