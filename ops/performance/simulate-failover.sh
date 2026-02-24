#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_POOL_ID_PRIMARY:?CLOUDFLARE_POOL_ID_PRIMARY is required}"
: "${CLOUDFLARE_POOL_ID_SECONDARY:?CLOUDFLARE_POOL_ID_SECONDARY is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

api_base="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/load_balancers/pools"

set_pool_enabled() {
  local pool_id="$1"
  local enabled="$2"
  curl --fail --silent --show-error \
    -X PATCH "${api_base}/${pool_id}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"enabled\": ${enabled}}" >/dev/null
}

echo "Disabling primary pool to simulate regional outage"
set_pool_enabled "$CLOUDFLARE_POOL_ID_PRIMARY" false

ops/disaster-recovery/validate-failover.sh

echo "Re-enabling primary pool"
set_pool_enabled "$CLOUDFLARE_POOL_ID_PRIMARY" true

if [[ "${KEEP_SECONDARY_ACTIVE:-false}" != "true" ]]; then
  set_pool_enabled "$CLOUDFLARE_POOL_ID_SECONDARY" true
fi

echo "Failover simulation completed"