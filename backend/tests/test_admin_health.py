from pathlib import Path

import admin_health


def test_release_snapshot_compares_git_and_deployment_sha(monkeypatch, tmp_path: Path):
    values = {
        ("rev-parse", "HEAD"): "abcdef1234567890",
        ("rev-parse", "--abbrev-ref", "HEAD"): "main",
        ("status", "--porcelain"): "",
    }

    monkeypatch.setattr(
        admin_health,
        "_run_git",
        lambda args, cwd: values.get(tuple(args)),
    )
    monkeypatch.setenv("RELEASE_SHA", "abcdef123456")

    result = admin_health.get_release_snapshot(tmp_path)

    assert result["runtime"] == "git+deployment"
    assert result["git_head"] == "abcdef1234567890"
    assert result["git_branch"] == "main"
    assert result["git_dirty"] is False
    assert result["deployment_sha"] == "abcdef123456"
    assert result["aligned"] is True


def test_release_snapshot_reports_dirty_and_mismatch(monkeypatch, tmp_path: Path):
    values = {
        ("rev-parse", "HEAD"): "aaaaaaaaaaaa",
        ("rev-parse", "--abbrev-ref", "HEAD"): "main",
        ("status", "--porcelain"): " M frontend/src/App.js",
    }

    monkeypatch.setattr(
        admin_health,
        "_run_git",
        lambda args, cwd: values.get(tuple(args)),
    )
    monkeypatch.setenv("RELEASE_SHA", "bbbbbbbbbbbb")

    result = admin_health.get_release_snapshot(tmp_path)

    assert result["git_dirty"] is True
    assert result["aligned"] is False


def test_release_snapshot_handles_runtime_without_git_or_deploy_sha(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(admin_health, "_run_git", lambda args, cwd: None)
    for key in admin_health._DEPLOYMENT_SHA_KEYS:
        monkeypatch.delenv(key, raising=False)

    result = admin_health.get_release_snapshot(tmp_path)

    assert result == {
        "runtime": "unavailable",
        "git_head": None,
        "git_branch": None,
        "git_dirty": None,
        "deployment_sha": None,
        "aligned": None,
    }
