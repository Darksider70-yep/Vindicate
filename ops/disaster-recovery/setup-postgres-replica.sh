#!/usr/bin/env bash
set -euo pipefail

: "${PRIMARY_DB_HOST:?PRIMARY_DB_HOST is required}"
: "${PRIMARY_DB_PORT:=5432}"
: "${REPLICA_USER:=vindicate_replica}"
: "${REPLICA_SLOT:=vindicate_region_b_slot}"
: "${PGDATA:?PGDATA is required}"

rm -rf "$PGDATA"
mkdir -p "$PGDATA"

pg_basebackup \
  -h "$PRIMARY_DB_HOST" \
  -p "$PRIMARY_DB_PORT" \
  -U "$REPLICA_USER" \
  -D "$PGDATA" \
  -Fp \
  -Xs \
  -P \
  -R \
  -S "$REPLICA_SLOT"

echo "Replica base backup complete"