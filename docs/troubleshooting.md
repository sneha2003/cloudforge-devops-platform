# Troubleshooting

**Dashboard says request failed.** Run `docker compose ps`, check API health at <http://localhost:8000/health/ready>, then inspect `docker compose logs api dashboard`. A stale dashboard may need a hard refresh after rebuild.

**Monitoring panels are empty.** Wait at least two 15-second scrapes, generate traffic, and check <http://localhost:9090/targets>. Empty panels are expected before samples exist. On Docker Desktop, exporter mount compatibility depends on the Linux VM.

**Grafana login fails.** Credentials come from `.env` on the first creation of the Grafana volume. Changing `.env` later does not rewrite the stored admin account. Use Grafana's documented password reset or intentionally recreate only its volume after preserving anything needed.

**Port already in use.** Identify the process or edit the host side of the relevant `ports` mapping. Do not change container ports without updating dependent configuration.

**API cannot write the database.** Confirm the named volume is mounted and the container user owns `/data`. Do not run the container as root as a shortcut.

**Rollback says no verified image.** A successful baseline must exist first. Promote a verified release before testing release-candidate rejection.

**Terraform provider download fails.** Confirm network access and proxy settings, then retry `terraform init`. Validation cannot occur until the provider plugin is available.

**Azure image pull fails.** Confirm package visibility or configure a short-lived registry credential from a secret manager. Never paste a token into a workflow input or log.

