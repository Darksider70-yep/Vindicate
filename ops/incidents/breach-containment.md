# Breach Containment Procedure

1. Freeze issuance by revoking issuer access or pausing the contract through governance admin.
2. Trigger emergency override endpoint `POST /api/v1/credentials/emergency/revoke` for known compromised hashes.
3. Rotate compromised API keys and signing key references.
4. Force logout all active sessions for affected users.
5. Isolate affected region by draining traffic in global DNS pool.
6. Export immutable audit logs for forensics.
7. Engage legal/compliance review for disclosure obligations.