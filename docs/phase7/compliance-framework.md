# Compliance Framework (Phase 7)

## GDPR

### Lawful processing and minimization
- Credential payload is hashed and anchored; personal-data-rich files are encrypted before storage.
- Access to decrypted payload requires key material from controlled key-management flow.

### Right to be forgotten workaround
- On erasure request, execute key shredding (`backend/scripts/compliance/gdpr-key-shred.js`).
- Result: encrypted payload remains for integrity proof, but plaintext becomes irrecoverable.
- Hash and chain anchors are retained as legal/integrity evidence.

### Retention
- Audit logs retained according to `AUDIT_RETENTION_DAYS`.
- Expired audit logs are pruned on scheduler interval.

## SOC 2 Readiness Mapping

- CC6 (Logical access): role-based auth + API key governance + tiered throttling.
- CC7 (Monitoring): anomaly hooks + alert dispatch + SIEM schema.
- CC8 (Change management): Terraform + environment-scoped CI/CD pipeline.
- CC9 (Risk mitigation): disaster recovery automation and failover tests.

## ISO 27001 Alignment (Annex A)

- A.5 policies: incident workflows and documented escalation.
- A.8 asset management: versioned IaC and environment-specific state isolation.
- A.9 access control: least privilege roles + key manager policy checks.
- A.12 operations security: monitored SLO/error budgets and backup automation.
- A.16 incident management: runbooks, severity matrix, and containment procedures.

## Audit Logging Structure

Stored as append-only JSONL entries with chained hashes:

- `timestamp`
- `eventType`
- `requestId`
- `actorId`
- `actorRole`
- `sourceIp`
- `resourceType`
- `resourceId`
- `outcome`
- `previousHash`
- `entryHash`

Tamper detection is achieved by validating the hash chain from `GENESIS` to latest entry.