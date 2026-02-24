#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <status: investigating|identified|monitoring|resolved> <message>" >&2
  exit 1
fi

: "${STATUSPAGE_WEBHOOK_URL:?STATUSPAGE_WEBHOOK_URL is required}"

status="$1"
shift
message="$*"

payload=$(cat <<JSON
{
  "status": "${status}",
  "message": "${message}",
  "service": "vindicate",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
)

curl --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$payload" \
  "$STATUSPAGE_WEBHOOK_URL"

echo "Status page update sent"