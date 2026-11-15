#!/usr/bin/env bash
set -Eeuo pipefail

image="${1:?Usage: deploy.sh IMAGE VERSION [--simulate-failure]}"
version="${2:?Version is required}"
simulate="${3:-}"
[[ "${image}" =~ ^[a-zA-Z0-9._/:@-]+$ ]] || { echo "Image contains unsupported characters." >&2; exit 2; }
[[ "${version}" =~ ^[a-zA-Z0-9._-]+$ ]] || { echo "Version must use letters, digits, dots, underscores, or hyphens." >&2; exit 2; }
[[ "${GITHUB_SHA:-0000000}" =~ ^[0-9a-fA-F]{7,40}$ ]] || { echo "GITHUB_SHA is invalid." >&2; exit 2; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
state_dir="${root}/deploy/artifacts"
state_file="${state_dir}/last-successful.env"
log_file="${state_dir}/deployment-${version//[^a-zA-Z0-9_.-]/_}.log"
mkdir -p "${state_dir}"
cd "${root}"

operator_token="${CLOUDFORGE_OPERATOR_TOKEN:-local-development-only}"
api_url="${CLOUDFORGE_API_URL:-http://127.0.0.1:8000}"
service_url="${CLOUDFORGE_SERVICE_URL:-http://127.0.0.1:8100}"
[[ "${api_url}" =~ ^https?://[a-zA-Z0-9.:-]+$ ]] || { echo "CLOUDFORGE_API_URL is invalid." >&2; exit 2; }
[[ "${service_url}" =~ ^https?://[a-zA-Z0-9.:-]+$ ]] || { echo "CLOUDFORGE_SERVICE_URL is invalid." >&2; exit 2; }
previous_image=""
previous_version=""
if [[ -f "${state_file}" ]]; then source "${state_file}"; previous_image="${CLOUDFORGE_SAMPLE_IMAGE:-}"; previous_version="${CLOUDFORGE_VERSION:-}"; fi

record_id=""
if curl --fail --silent "${api_url}/health/ready" >/dev/null 2>&1; then
  record_id="$(curl --fail --silent -X POST "${api_url}/api/v1/deployments" -H 'Content-Type: application/json' -H "X-Operator-Token: ${operator_token}" -d "{\"version\":\"${version}\",\"image\":\"${image}\",\"commit_sha\":\"${GITHUB_SHA:-0000000}\",\"environment\":\"${CLOUDFORGE_ENV:-local}\",\"status\":\"deploying\"}" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')"
fi

export CLOUDFORGE_SAMPLE_IMAGE="${image}" CLOUDFORGE_VERSION="${version}" CLOUDFORGE_FORCE_NOT_READY=false
[[ "${simulate}" == "--simulate-failure" ]] && export CLOUDFORGE_FORCE_NOT_READY=true
docker compose up -d --no-deps sample-service 2>&1 | tee "${log_file}"

healthy=false
for _ in {1..20}; do
  if curl --fail --silent "${service_url}/health/ready" >/dev/null 2>&1; then healthy=true; break; fi
  sleep 2
done
if [[ "${healthy}" == true ]] && bash "${root}/deploy/scripts/smoke-test.sh" "${service_url}" >>"${log_file}" 2>&1; then
  printf 'CLOUDFORGE_SAMPLE_IMAGE=%q\nCLOUDFORGE_VERSION=%q\n' "${image}" "${version}" >"${state_file}"
  [[ -n "${record_id}" ]] && curl --fail --silent -X PATCH "${api_url}/api/v1/deployments/${record_id}" -H 'Content-Type: application/json' -H "X-Operator-Token: ${operator_token}" -d '{"status":"succeeded","verification":"Readiness and smoke tests passed"}' >/dev/null
  echo "Release ${version} verified successfully."
  exit 0
fi

echo "Release verification failed; attempting deployment rollback." | tee -a "${log_file}"
if [[ -z "${previous_image}" ]]; then echo "No previously verified image is available." >&2; exit 1; fi
export CLOUDFORGE_SAMPLE_IMAGE="${previous_image}" CLOUDFORGE_VERSION="${previous_version}" CLOUDFORGE_FORCE_NOT_READY=false
docker compose up -d --no-deps sample-service 2>&1 | tee -a "${log_file}"
for _ in {1..20}; do curl --fail --silent "${service_url}/health/ready" >/dev/null 2>&1 && break; sleep 2; done
bash "${root}/deploy/scripts/smoke-test.sh" "${service_url}" >>"${log_file}" 2>&1
if [[ -n "${record_id}" ]]; then
  curl --fail --silent -X PATCH "${api_url}/api/v1/deployments/${record_id}" -H 'Content-Type: application/json' -H "X-Operator-Token: ${operator_token}" -d "{\"status\":\"rolled_back\",\"verification\":\"New release failed readiness; prior release recovered\",\"rollback_version\":\"${previous_version}\"}" >/dev/null
  curl --fail --silent -X POST "${api_url}/api/v1/incidents" -H 'Content-Type: application/json' -H "X-Operator-Token: ${operator_token}" -d "{\"service\":\"workboard\",\"severity\":\"critical\",\"summary\":\"Release ${version} failed verification\",\"deployment_id\":${record_id},\"recovery\":\"Rolled back to ${previous_version}; smoke tests passed\"}" >/dev/null
fi
echo "Rollback to ${previous_version} succeeded; failed release remains failed." >&2
exit 1

