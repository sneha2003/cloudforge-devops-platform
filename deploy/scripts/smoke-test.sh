#!/usr/bin/env bash
set -Eeuo pipefail

base_url="${1:-http://127.0.0.1:8100}"
curl --fail --silent --show-error "${base_url}/health/ready" | grep -q '"status":"ready"'
curl --fail --silent --show-error "${base_url}/api/info" | grep -q '"name":"WorkBoard"'
curl --fail --silent --show-error "${base_url}/api/tasks" | grep -q '^\['
echo "Smoke tests passed for ${base_url}"

