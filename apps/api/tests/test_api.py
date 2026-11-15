def test_health_endpoints(client):
    assert client.get("/health/live").json() == {"status": "alive"}
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["checks"]["database"] == "ok"


def test_operational_metadata_requires_token(client, operator_headers):
    payload = {
        "version": "1.2.3",
        "image": "ghcr.io/acme/cloudforge:sha-1234567",
        "commit_sha": "1234567",
        "environment": "local",
    }
    assert client.post("/api/v1/deployments", json=payload).status_code == 401
    created = client.post("/api/v1/deployments", json=payload, headers=operator_headers)
    assert created.status_code == 201
    deployment_id = created.json()["id"]
    updated = client.patch(
        f"/api/v1/deployments/{deployment_id}",
        json={"status": "succeeded", "verification": "Smoke tests passed"},
        headers=operator_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "succeeded"
    assert client.get("/api/v1/status").json()["last_successful_deployment"]["version"] == "1.2.3"


def test_tasks_are_persisted(client):
    response = client.post("/api/v1/tasks", json={"title": "Ship CloudForge"})
    assert response.status_code == 201
    assert client.get("/api/v1/tasks").json()[0]["title"] == "Ship CloudForge"


def test_validation_rejects_invalid_environment(client, operator_headers):
    response = client.post(
        "/api/v1/deployments",
        json={
            "version": "bad",
            "image": "image",
            "commit_sha": "1234567",
            "environment": "Production Environment",
        },
        headers=operator_headers,
    )
    assert response.status_code == 422


def test_missing_deployment_returns_404(client):
    assert client.get("/api/v1/deployments/9999").status_code == 404


def test_monitoring_reports_unavailable_data_honestly(client):
    response = client.get("/api/v1/monitoring?range_minutes=5")
    assert response.status_code == 200
    series = response.json()
    assert len(series) == 6
    assert all(item["available"] is False for item in series)
    assert all(item["reason"].startswith("Metrics unavailable") for item in series)
