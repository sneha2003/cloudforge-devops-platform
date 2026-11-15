import os
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    data_dir = Path(".test-data")
    data_dir.mkdir(exist_ok=True)
    database_path = data_dir / f"workboard-{uuid4().hex}.db"
    os.environ["WORKBOARD_DATABASE_PATH"] = str(database_path)
    os.environ["WORKBOARD_FORCE_NOT_READY"] = "false"
    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    try:
        database_path.unlink(missing_ok=True)
    except PermissionError:
        pass

