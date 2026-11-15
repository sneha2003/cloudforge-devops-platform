# Incident runbook

## API release fails readiness

1. Confirm the deployment command's non-zero result; do not rerun blindly.
2. Check whether it reports successful rollback and smoke tests.
3. Open Deployments and Incident Center, correlate release ID/time, and preserve the log from `deploy/artifacts`.
4. Run `docker compose ps` and inspect `docker compose logs --since 15m api`.
5. Verify `/health/ready`, `/api/v1/info`, Prometheus target health, error rate, and latency.
6. If automatic rollback failed, restore the exact image/version from `last-successful.env`, run `docker compose up -d --no-deps api`, and run the smoke test.
7. Escalate if readiness remains unavailable; avoid deleting volumes because that destroys evidence and metadata.

## Safe demonstration

First establish a verified baseline. Then run the deploy script with `--simulate-failure`. This sets an explicit readiness failure flag on the candidate, causing a real 503 and failed probe. The workflow restores the baseline, verifies it, writes an incident, and exits 1. Remove no records: the failed release is part of the audit trail.

## Closeout

Record impact window, root cause, affected version, diagnostic evidence, recovery version, validation result, and preventive action. A container restart is not a deployment rollback; rollback restores prior application content. Infrastructure recovery is separate again.

