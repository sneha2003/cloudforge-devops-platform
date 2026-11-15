# Docker explained

Docker packages an application and its runtime into an image. A container is a running instance of that image. Compose describes how multiple containers connect, start, persist data, and expose selected ports.

CloudForge has separate API and dashboard images. Both use multi-stage builds: build tools remain in an earlier stage, while the final stage contains only runtime files. The API runs as a dedicated user; Nginx uses its upstream unprivileged image. Capabilities are dropped and `no-new-privileges` is enabled where practical.

`compose.yaml` creates two networks. The dashboard reaches the API on `frontend`; Prometheus, Grafana, and exporters use internal `observability`. Prometheus and Grafana bind to `127.0.0.1`, so another computer cannot connect through the host network by default. Named volumes retain database and telemetry data.

Useful commands:

```bash
docker compose up --build -d   # build and start
docker compose ps              # inspect health
docker compose logs -f api     # investigate one service
docker compose pull            # fetch configured images
docker compose down            # stop, keep volumes
```

The browser never receives `/var/run/docker.sock`. Deployment scripts control Docker from an operator shell, which is a meaningful privilege boundary.

