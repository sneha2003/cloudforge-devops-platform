# Getting started

## What you need

Install Git and Docker Desktop. Select Linux containers and ensure `docker compose version` works. Python 3.12 and Node 22 are needed only when developing outside containers.

## First run

1. Copy `.env.example` to `.env`.
2. Replace the operator token and Grafana password with long random values. Do not commit `.env`.
3. Run `docker compose up --build -d` from the repository root.
4. Run `docker compose ps`; WorkBoard, the API, and the dashboard should report healthy.
5. Open WorkBoard at <http://localhost:8100>.
6. Open CloudForge at <http://localhost:3000> to see WorkBoard's health and activity. Grafana is at <http://localhost:3001>.

The first image build downloads dependencies and can take several minutes. The API database, Prometheus data, and Grafana state use named volumes, so `docker compose down` does not erase them. To intentionally reset local data, use `docker compose down -v`; this is destructive.

## Read the system

Use WorkBoard to add tasks, choose priorities and due dates, and move work between To do, In progress, and Done. CloudForge Overview summarizes WorkBoard's current health. Deployments and Incident Center start empty because CloudForge never fabricates release activity. Monitoring can take 30–60 seconds to populate after startup.

## Develop without Docker

Follow the test commands in the README. Start the API with `PYTHONPATH=apps/api uvicorn app.main:app --reload` after setting `CLOUDFORGE_DATABASE_PATH` to a writable local file. Start Vite with `npm run dev` in `apps/dashboard`; its proxy sends `/api` and `/health` to port 8000.

