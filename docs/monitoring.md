# Monitoring and observability

Metrics answer “what is happening?” CloudForge's FastAPI middleware counts requests and measures latency. A readiness gauge reflects whether the service can receive traffic. Node Exporter reports host CPU/memory; cAdvisor reports containers.

Prometheus scrapes every 15 seconds using `monitoring/prometheus/prometheus.yml`. Grafana discovers Prometheus and the dashboard automatically from `monitoring/grafana`. The React dashboard asks the API for a limited, predefined set of PromQL queries; it cannot issue arbitrary monitoring queries.

Generate bounded traffic with `deploy/scripts/generate-load.sh`. After two scrape intervals, request rate and latency change. A missing series remains visibly unavailable rather than becoming invented sample data.

Alerts in `monitoring/alerting/rules.yml` cover readiness, sustained HTTP error rate, and host memory pressure. Readiness can be exercised safely with the documented release-candidate rejection. The alert waits one minute to avoid noise. Alertmanager is not configured because notification routing requires a real recipient policy; add it when an organization can define receivers and escalation rules.

Prometheus retains seven days locally. This is suitable for local operations and evaluation, not a regulated production archive. On macOS/Windows Docker Desktop, host exporter values describe the Linux VM used by Docker, not the entire physical host; the UI labels the source rather than claiming otherwise.

