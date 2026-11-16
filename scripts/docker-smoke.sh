#!/usr/bin/env bash
# Smoke test for the Docker Compose deployment. Used by CI and runnable locally (Git Bash, Linux, macOS):
#   docker compose up -d --build --wait && bash scripts/docker-smoke.sh
set -euo pipefail

PORT="${WEB_PORT:-4180}"
# Explicit IPv4: `localhost` may resolve to ::1 for curl but to 127.0.0.1 for a browser (or vice versa).
BASE="${BASE_URL:-http://127.0.0.1:$PORT}"
failures=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; failures=$((failures + 1)); }
expect_contains() { # name, haystack, needle
  if grep -q -- "$3" <<<"$2"; then pass "$1"; else fail "$1 (expected to contain: $3)"; fi
}

echo "Smoke test against $BASE"

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
[[ "$status" == 200 ]] && pass "web: index served (200)" || fail "web: index returned $status"

expect_contains "web: SPA deep link /customers/1 falls back to index.html" \
  "$(curl -s "$BASE/customers/1")" "<title>SaaS-O-Matic</title>"

# On Windows another program can silently share the port on the other IP family: the browser then lands on it
# while IPv4-only (or IPv6-only) checks pass. Both families must serve THIS app when they answer at all.
for family in "127.0.0.1" "[::1]"; do
  body=$(curl -s -g --max-time 3 "http://$family:$PORT/" || true)
  if [[ -z "$body" ]]; then
    pass "port $PORT on $family: not listening (fine)"
  else
    expect_contains "port $PORT on $family serves this app (no other server sharing the port)" "$body" \
      "<title>SaaS-O-Matic</title>"
  fi
done

expect_contains "api via nginx proxy: /api/health" "$(curl -s "$BASE/api/health")" '"status":"ok"'

expect_contains "api: seed data + accent-insensitive search (q=nebula)" \
  "$(curl -s "$BASE/api/customers?q=nebula")" 'Analytics S.A.'

expect_contains "api: invalid Spanish DNI rejected with reason" \
  "$(curl -s -X POST "$BASE/api/customers" -H 'content-type: application/json' \
    -d '{"companyName":"Smoke","taxId":"12345678A","email":"a@b.es","countryCode":"ES","plan":"basic"}')" \
  '"message":"INVALID_CONTROL"'

created=$(curl -s -X POST "$BASE/api/simulations" -H 'content-type: application/json' \
  -d '{"customerId":1,"activeUsers":15,"storageGb":0,"apiCalls":0}')
expect_contains "api: server-side quote, 15 users pro ES = 16940 cents (140 € + 21 %)" "$created" '"totalCents":16940'
simulation_id=$(grep -o '"id":[0-9]*' <<<"$created" | head -1 | cut -d: -f2)

echo "Restarting the api container to check persistence…"
docker compose restart api >/dev/null
for _ in $(seq 1 60); do
  [[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/health")" == 200 ]] && break
  sleep 1
done
expect_contains "persistence: simulation #${simulation_id:-?} survives an api restart (named volume)" \
  "$(curl -s "$BASE/api/customers/1/simulations")" "\"id\":${simulation_id:-x},"

if ((failures > 0)); then
  echo "Smoke test FAILED: $failures check(s)"
  exit 1
fi
echo "Smoke test passed"
