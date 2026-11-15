import os
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    test_data = Path(".test-data")
    test_data.mkdir(exist_ok=True)
    database_path = test_data / f"{uuid4().hex}.db"
    os.environ["CLOUDFORGE_DATABASE_PATH"] = str(database_path)
    os.environ["CLOUDFORGE_OPERATOR_TOKEN"] = "test-operator-token"
    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    try:
        database_path.unlink(missing_ok=True)
    except PermissionError:
        # Windows virus scanners can briefly retain SQLite handles; this directory is disposable.
        pass


@pytest.fixture()
def operator_headers():
    return {"X-Operator-Token": "test-operator-token"}

