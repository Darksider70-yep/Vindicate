#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_DIR:=./.dist/backups/postgres}"
: "${RETENTION_DAYS:=30}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
out_file="$BACKUP_DIR/vindicate_${timestamp}.dump"

pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$out_file"

find "$BACKUP_DIR" -type f -name "vindicate_*.dump" -mtime "+$RETENTION_DAYS" -delete

sha256sum "$out_file" > "${out_file}.sha256"

echo "Backup created: $out_file"