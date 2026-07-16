"""
Shared pytest fixtures — auto-clears in-memory rate-limit buckets before
every test so per-IP limits (which are process-wide, not per-test) don't
cause flaky 429s when many state-changing tests run in one session.

The reset endpoint is admin-gated; we upsert a Mongo admin session on first
import so the reset can be invoked.
"""
import os
import subprocess
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_COOKIES = {"session_token": "test_admin_session"}
STATE_CHANGE_HEADERS = {"X-Requested-With": "fetch"}


def _mongo():
    mongo_url = "mongodb://localhost:27017"
    db_name = "test_database"
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
    return mongo_url, db_name


def _run_mongo(script):
    mongo_url, db_name = _mongo()
    return subprocess.run(
        ["mongosh", f"{mongo_url}/{db_name}", "--quiet", "--eval", script],
        check=False, capture_output=True, timeout=20,
    )


@pytest.fixture(scope="session", autouse=True)
def _ensure_admin_session_globally():
    _run_mongo(
        'db.users.updateOne({user_id:"user_test"},'
        '{$set:{user_id:"user_test", email:"raks.agarwal325@gmail.com", name:"Test Admin",'
        ' created_at:new Date().toISOString()}}, {upsert:true});'
        'db.user_sessions.updateOne({session_token:"test_admin_session"},'
        '{$set:{session_token:"test_admin_session", user_id:"user_test",'
        ' email:"raks.agarwal325@gmail.com",'
        ' expires_at:new Date(Date.now()+86400000).toISOString(),'
        ' created_at:new Date().toISOString()}}, {upsert:true});'
    )
    yield


@pytest.fixture(autouse=True)
def _reset_rate_limits_before_each_test():
    try:
        requests.post(
            f"{API}/admin/_reset-rate-limit",
            cookies=ADMIN_COOKIES,
            headers=STATE_CHANGE_HEADERS,
            timeout=5,
        )
    except Exception:
        pass
    yield
