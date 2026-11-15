# Validation report — updated 15 November 2026

This report separates executed checks from configuration-only and cloud-dependent work.

## Passed locally

- Backend/cross-cutting tests: **8 passed** (`pytest apps/api/tests tests`). Coverage includes liveness/readiness, authorization, deployment state transitions, persistence, validation, 404 handling, honest missing telemetry, and rollback-script stages.
- WorkBoard tests: **3 passed**, covering health, task creation/update, statistics, and validation.
- Python quality: **Ruff passed** with no project warnings or errors.
- Frontend lint: **passed** with zero warnings.
- Frontend component test: **1 passed**; verifies healthy live state and the absence of fabricated deployment history.
- Frontend production build: **passed** with Vite 8 and TypeScript 6. Vite reports a non-blocking 600 kB main-chunk optimization warning.
- Frontend dependency audit: **0 vulnerabilities** reported by `npm audit` after migration to Tailwind 4.
- Configuration syntax: local and Azure Compose models resolved; all repository YAML and JSON parsed successfully.
- Secret-pattern scan: no private key, account key, client secret, or hard-coded non-example password pattern found.
- Direct integration: FastAPI and Vite ran together; status, info, deployments, incidents, and monitoring requests returned HTTP 200.
- Browser quality check: loading, unavailable-metric handling, mobile rendering, measured 1440 px layout, stable section links, navigation, and System Topology content were verified. Browser console had no warnings or errors. Current overview, topology, and WorkBoard screenshots are stored under `docs/assets/`.
- Docker Compose runtime: **verified on Docker Desktop for Windows** after adding a portable Node Exporter mount and a loopback operator network.
- Runtime endpoints: WorkBoard, WorkBoard readiness, CloudForge dashboard, API status, Prometheus readiness, and Grafana health all returned HTTP 200.
- Browser product check: a real WorkBoard task was created, moved from To do to In progress, and reflected immediately in the statistics and activity feed.
- Prometheus collection: WorkBoard, CloudForge API, Node Exporter, and cAdvisor targets all reported `up`; live WorkBoard request metrics were observed.
- GitHub-hosted CI: backend, frontend, container/security, and Terraform jobs passed on `main` ([run 43711193270](https://github.com/sneha2003/cloudforge-devops-platform/actions/runs/43711193270)).
- GHCR publication: API, dashboard, and WorkBoard images were built and published with immutable SHA tags, SBOM, and provenance ([run 43711193328](https://github.com/sneha2003/cloudforge-devops-platform/actions/runs/43711193328)).

The only Python test warning originates in the pinned Starlette test client's use of an AnyIO compatibility alias; it is not a failing project check.

## Cloud-dependent checks

- **End-to-end container rollback:** verified locally. A release candidate failed readiness policy, CloudForge restored the last verified WorkBoard artifact, reran smoke tests, and recorded the rolled-back release and correlated incident.
- **Terraform provider validation:** the Terraform CLI is not installed. Files were syntax-reviewed, and CI is configured to run `fmt`, `init -backend=false`, and `validate`.
- **Azure deployment:** no subscription, credentials, DNS name, or spending authorization was provided. No cloud resource was created.

## Acceptance status

WorkBoard application code, CloudForge dashboard and API, local Docker runtime, health/readiness, monitoring collection, GitHub-hosted CI, immutable release publishing, alerting, Terraform, HTTPS cloud overlay, rollback, security controls, automated tests, and documentation are implemented. Local rollback and hosted pipelines are verified. Terraform-provider and Azure checks remain explicitly pending for the environmental reasons above.

