#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-http://127.0.0.1:8100}"
requests="${2:-120}"
delay="${3:-0.1}"
if (( requests > 1000 )); then echo "Refusing more than 1000 requests." >&2; exit 2; fi
for ((i=1; i<=requests; i++)); do
  curl --fail --silent "${base_url}/api/tasks" >/dev/null || true
  sleep "${delay}"
done
echo "Generated ${requests} bounded local requests."

