"""
Shared pytest fixtures.

Resets in-memory rate-limit buckets on the running backend BEFORE every
test (except tests marked `no_reset`) so per-IP limits do not cause flaky
429s during rapid state-changing test runs.

No public HTTP endpoint is used — we send SIGUSR1 to the backend worker
whose PID is published at /tmp/backend_worker.pid on startup. Signals
cannot cross network boundaries, so this reset path is inaccessible to
any external caller.

Design highlights:
  - Per-bucket reset: fixture writes the bucket name into a file the
    signal handler reads. Other workers testing unrelated buckets are
    unaffected.
  - Per-bucket hold: rate-limit-verification tests write a per-bucket
    sentinel so parallel workers can skip resets ONLY on that bucket
    while the test runs.
  - Cross-worker serialization: a single fcntl-locked file guards the
    write-then-signal window so concurrent fixtures cannot race on the
    shared /tmp/backend_rl_bucket file.
"""
import fcntl
import os
import signal
import subprocess
import time
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_COOKIES = {"session_token": "test_admin_session"}
STATE_CHANGE_HEADERS = {"X-Requested-With": "fetch"}

# Cross-worker sentinel directory.
_HOLD_DIR = "/tmp/pytest_rl_holds"
_LOCK_PATH = "/tmp/pytest_rl_signal.lock"
_BUCKET_FILE = "/tmp/backend_rl_bucket"
os.makedirs(_HOLD_DIR, exist_ok=True)

# Module → rate-limit bucket name for the endpoint the module exercises.
# A test in an un-listed module has its bucket inferred as "" (clear all).
_BUCKET_BY_MODULE = {
    "test_reviews_moderation": "reviews",
    "test_inquiries_price_security": "inquiries",
    "test_inquiries_legacy_email_fix": "inquiries",
    "test_contact_enquiry_type": "contact",
    "test_products_pagination": None,  # no rate-limited endpoint used
    "test_authz_ssrf_ratelimit": "",   # exercises multiple buckets
}


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "no_reset: skip the autouse rate-limit reset for this test (used "
        "by tests that verify rate limits by intentionally exhausting a "
        "bucket).",
    )


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


def _backend_worker_pid():
    try:
        with open("/tmp/backend_worker.pid") as f:
            pid = int(f.read().strip())
            if pid != os.getpid():
                return pid
    except (OSError, ValueError):
        pass
    out = subprocess.run(
        ["pgrep", "-f", "uvicorn server:app"], check=False,
        capture_output=True, text=True,
    )
    for line in out.stdout.splitlines():
        try:
            p = int(line.strip())
        except ValueError:
            continue
        if p != os.getpid():
            return p
    return None


def _reset_backend_rate_limits(bucket: str):
    """Signal the backend to clear either `bucket` or (if empty) all buckets.
    Serialized across workers by an fcntl lock on _LOCK_PATH so that the
    write-then-signal window is atomic — otherwise two workers targeting
    different buckets could stomp on _BUCKET_FILE mid-signal."""
    pid = _backend_worker_pid()
    if not pid:
        _debug(f"no backend pid — skipping reset(bucket={bucket!r})")
        return
    with open(_LOCK_PATH, "w") as lock:
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            with open(_BUCKET_FILE, "w") as bf:
                bf.write(bucket or "")
            try:
                os.kill(pid, signal.SIGUSR1)
            except (ProcessLookupError, PermissionError) as e:
                _debug(f"kill pid={pid} failed: {e}")
                return
            # Synchronous wait: the handler deletes _BUCKET_FILE after it
            # runs, so poll until it disappears (or a 500ms timeout).
            deadline = time.monotonic() + 0.5
            cleared = False
            while time.monotonic() < deadline:
                if not os.path.exists(_BUCKET_FILE):
                    cleared = True
                    break
                time.sleep(0.005)
            if not cleared:
                _debug(f"reset timed out (bucket={bucket!r}) pid={pid}")
        finally:
            try:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
            except OSError:
                pass


def _debug(msg: str):
    try:
        with open("/tmp/pytest_rl_debug.log", "a") as f:
            f.write(f"[{time.time():.3f} pid={os.getpid()}] {msg}\n")
    except OSError:
        pass


def _bucket_for(nodeid: str) -> str | None:
    """Infer the rate-limit bucket for a test based on its module name.
    Returns "" for "clear-all", None for "skip reset entirely"."""
    # nodeid like "tests/test_reviews_moderation.py::test_xxx"
    fname = nodeid.split("::", 1)[0].rsplit("/", 1)[-1]
    module = fname[:-3] if fname.endswith(".py") else fname
    if module in _BUCKET_BY_MODULE:
        return _BUCKET_BY_MODULE[module]
    return ""  # default: clear all


def _hold_path(bucket: str) -> str:
    key = bucket if bucket else "_all"
    return os.path.join(_HOLD_DIR, f"{key}.{os.getpid()}.{time.time_ns()}")


def _hold_active_for(bucket: str) -> bool:
    """A hold on `bucket` (or on "_all") means we must not clear it."""
    try:
        entries = list(os.scandir(_HOLD_DIR))
    except FileNotFoundError:
        return False
    prefixes = ("_all.",)
    if bucket:
        prefixes = ("_all.", f"{bucket}.")
    for ent in entries:
        if ent.name.startswith(prefixes):
            return True
    return False


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
def _reset_rate_limits_before_each_test(request):
    bucket = _bucket_for(request.node.nodeid)
    if bucket is None:
        yield
        return

    marker = request.node.get_closest_marker("no_reset")
    if marker is not None:
        # If the marker specifies a bucket (e.g. @pytest.mark.no_reset("inquiries")),
        # scope the hold to just that bucket so other modules' tests targeting
        # unrelated buckets can still reset normally. Fall back to the module's
        # default bucket if no explicit arg.
        held_bucket = marker.args[0] if marker.args else bucket
        hold = _hold_path(held_bucket)
        with open(hold, "w") as f:
            f.write(request.node.nodeid)
        try:
            _debug(f"BEFORE {request.node.nodeid} (no_reset, held={held_bucket!r}) - clear bucket={bucket!r}")
            _reset_backend_rate_limits(bucket)
            yield
        finally:
            try:
                os.unlink(hold)
            except FileNotFoundError:
                pass
        return

    if _hold_active_for(bucket):
        _debug(f"BEFORE {request.node.nodeid} (bucket={bucket!r}) - HOLD active, skip")
        yield
        return

    _debug(f"BEFORE {request.node.nodeid} (bucket={bucket!r}) - reset")
    _reset_backend_rate_limits(bucket)
    yield
