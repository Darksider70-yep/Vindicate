-- Run on primary Postgres instance as superuser
CREATE ROLE vindicate_replica WITH REPLICATION LOGIN PASSWORD 'replace_with_secure_password';

SELECT * FROM pg_create_physical_replication_slot('vindicate_region_b_slot');

-- Validate WAL sender settings
SHOW wal_level;
SHOW max_wal_senders;
SHOW max_replication_slots;