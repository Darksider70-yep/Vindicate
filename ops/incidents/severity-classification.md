# Incident Severity Matrix

## SEV-1 (Critical)
- Multi-region outage, active credential fraud, key compromise, or confirmed data breach.
- RTO target: 30 minutes.
- Mandatory incident commander and status page update every 30 minutes.

## SEV-2 (High)
- Regional degradation, issuance path failures, sustained SLO breach > 15 minutes.
- RTO target: 60 minutes.
- Status page update every 60 minutes.

## SEV-3 (Medium)
- Non-critical endpoint regression, partial automation failure with safe manual fallback.
- RTO target: next business day.

## SEV-4 (Low)
- Cosmetic defects, documentation drift, no customer-facing impact.
- Routed to backlog.