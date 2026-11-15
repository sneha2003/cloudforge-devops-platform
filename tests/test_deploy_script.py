from pathlib import Path


def test_deployment_script_contains_required_rollback_stages():
    script = Path("deploy/scripts/deploy.sh").read_text(encoding="utf-8")
    required = [
        "last-successful.env",
        "health/ready",
        "smoke-test.sh",
        "rolled_back",
        "previous_image",
        "deployment rollback",
    ]
    for stage in required:
        assert stage in script


def test_deployment_does_not_suppress_failed_release():
    script = Path("deploy/scripts/deploy.sh").read_text(encoding="utf-8")
    assert script.rstrip().endswith("exit 1")
