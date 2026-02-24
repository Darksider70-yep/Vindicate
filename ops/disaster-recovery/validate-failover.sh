#!/usr/bin/env bash
set -euo pipefail

: "${HEALTHCHECK_URL:=https://api.vindicate.example.com/health/ready}"
: "${MAX_ATTEMPTS:=30}"
: "${SLEEP_SECONDS:=10}"

attempt=1
until curl --fail --silent "$HEALTHCHECK_URL" >/dev/null; do
  if [[ "$attempt" -ge "$MAX_ATTEMPTS" ]]; then
    echo "Failover validation failed after ${MAX_ATTEMPTS} attempts" >&2
    exit 1
  fi
  echo "Attempt ${attempt}/${MAX_ATTEMPTS}: endpoint not healthy yet"
  sleep "$SLEEP_SECONDS"
  attempt=$((attempt + 1))
done

echo "Failover validation succeeded: ${HEALTHCHECK_URL}"