# CloudForge — Automated Cloud Infrastructure & DevOps Platform

## 40-word description

CloudForge is a containerized platform that monitors and safely releases WorkBoard, a real project-task web application. It combines health verification, live observability, immutable delivery, and rollback using FastAPI, React, Docker, Prometheus, Grafana, GitHub Actions, Terraform, and optional Azure infrastructure.

## 100-word description

CloudForge demonstrates the complete operational lifecycle of WorkBoard, a project-task web application with persistent data and a polished responsive interface. A separate operations API actively checks WorkBoard's health and identity, while a React control room shows live traffic, latency, deployments, infrastructure, and incidents. Docker Compose runs both applications with Prometheus, Grafana, Node Exporter, and cAdvisor. GitHub Actions test, scan, build, and publish immutable images. A controlled deployment script verifies each release and restores the last good WorkBoard image after failure. Optional Terraform provisions a minimal Azure VM without automatically creating paid resources.

## Resume bullets

- Built WorkBoard, a persistent project-task application, and CloudForge, a separate operations platform that actively monitors its health, traffic, latency, releases, and incidents.
- Built least-privilege GitHub Actions pipelines for automated linting, tests, Trivy scanning, multi-stage image builds, immutable GHCR releases, SBOM/provenance, and OIDC-based Azure delivery.
- Implemented verified deployment rollback that restores the last known-good image, re-runs smoke tests, preserves diagnostics, records recovery, and correctly reports the failed candidate release to CI.

## Technical interview talking points

1. Trust boundaries keep Docker, Terraform, and credentials out of the public dashboard.
2. Readiness and smoke tests gate promotion; recovery success does not convert a failed release into success.
3. Metrics are collected from real traffic, and unavailable series are never replaced with synthetic values.
4. Immutable commit-tagged images make releases auditable and rollback deterministic.
5. Compose/SQLite/one VM are explicit cost-complexity decisions with a documented scaling path.

## 90-second explanation

“CloudForge answers a practical DevOps question: how do I prove a code change is safe to release and recover if it is not? A GitHub pull request runs backend and frontend quality checks, security scanning, image builds, and Terraform validation. Merging creates commit-tagged container images with an SBOM and provenance. Deployment remains an approved operator action. The script remembers the last verified image, starts the candidate, waits for real readiness, runs smoke tests, and promotes it only on success. If checks fail, it restores the known-good image, verifies recovery, records both the failed deployment and incident, and keeps the CI result failed. Prometheus collects actual HTTP, latency, readiness, host, and container metrics; Grafana and the React dashboard visualize them. Everything runs locally, while Terraform provides an optional minimal Azure VM path using OIDC rather than stored cloud credentials.”

## Screenshots and video

Capture actual state only: WorkBoard with a few realistic tasks; CloudForge Overview showing WorkBoard healthy; Monitoring after bounded load; Grafana's provisioned overview; and, after a controlled release-candidate rejection, Release Management and Incidents. Use a 1080p browser and hide personal tokens or hostnames.

For a 90-second video: introduce the architecture (10s), show live health/metrics (15s), deploy baseline (15s), trigger failure and rollback (25s), correlate the incident and Grafana signals (15s), and close with CI/Terraform/security decisions (10s). Clearly label Azure as optional/unverified unless it has actually been exercised.

