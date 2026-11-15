def task_payload(title="Validate release readiness"):
    return {
        "title": title,
        "description": "Explain the release and rollback flow",
        "project": "Portfolio",
        "priority": "high",
        "status": "todo",
        "due_date": "2026-12-01",
    }


def test_page_and_health_are_available(client):
    assert client.get("/").status_code == 200
    assert "WorkBoard" in client.get("/").text
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").json()["status"] == "ready"


def test_task_lifecycle_and_statistics(client):
    created = client.post("/api/tasks", json=task_payload())
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert client.get("/api/stats").json()["total"] == 1

    moved = client.patch(f"/api/tasks/{task_id}", json={"status": "done"})
    assert moved.status_code == 200
    assert moved.json()["status"] == "done"
    assert client.get("/api/stats").json()["completion_rate"] == 100
    assert client.get("/api/activity").json()[0]["action"] == "completed"

    assert client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert client.get("/api/tasks").json() == []


def test_validation_and_missing_task(client):
    assert client.post("/api/tasks", json={"title": ""}).status_code == 422
    assert client.patch("/api/tasks/9999", json={"status": "done"}).status_code == 404
    assert client.delete("/api/tasks/9999").status_code == 404
