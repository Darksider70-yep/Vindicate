#!/usr/bin/env bash
set -euo pipefail

: "${BACKEND_URL:=http://localhost:4000/api/v1}"
: "${CREDENTIAL_HASH:=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}"

echo "Simulating IPFS outage by overriding primary endpoint to an unroutable address"
export IPFS_PRIMARY_API_URL="http://127.0.0.1:65535/api/v0"

echo "Running verification smoke calls during outage simulation"
for i in $(seq 1 20); do
  curl --silent --show-error "${BACKEND_URL}/credentials/${CREDENTIAL_HASH}" >/dev/null || true
  sleep 0.5
done

echo "IPFS outage simulation completed; verify fallback/alerting output in logs"