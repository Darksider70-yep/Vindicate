# Disaster Recovery Scripts

## Backups
- Create backup: `ops/disaster-recovery/backup-postgres.sh`
- Restore backup: `ops/disaster-recovery/restore-postgres.sh <backup.dump>`
- Configure replication role/slot: `ops/disaster-recovery/postgres-replication-setup.sql`
- Seed standby replica: `ops/disaster-recovery/setup-postgres-replica.sh`

## Data/index recovery
- Event resync: `cd backend && npm run dr:resync:events`
- Full chain rebuild: `cd backend && npm run dr:reindex:blockchain`
- IPFS repin sweep: `cd backend && npm run dr:repin:ipfs`

## Failover verification
- `ops/disaster-recovery/validate-failover.sh`

See `ops/disaster-recovery/playbook.md` for full scenario-based response procedures.
