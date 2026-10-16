import multiprocessing
import os
import sys
from contextlib import nullcontext
from unittest.mock import patch
import uuid

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi import HTTPException
from app.database import SessionLocal, engine
from app.models import User, AiReviewUsage
from app.services.ai_limiter import check_and_consume_ai_review


def run_limiter_request(uid: int, result_queue: multiprocessing.Queue):
    """Worker executed in an independent process with its own database connection."""
    session = SessionLocal()
    try:
        # threading.Lock is disabled using nullcontext to prove DB upsert + row lock alone is sufficient
        with patch("app.services.ai_limiter._limiter_lock", nullcontext()):
            res = check_and_consume_ai_review(session, uid)
            result_queue.put(("OK", res.get("remaining")))
    except HTTPException as exc:
        result_queue.put(("429", exc.status_code, exc.detail.get("message") if isinstance(exc.detail, dict) else exc.detail))
    except Exception as exc:
        session.rollback()
        result_queue.put(("ERR", type(exc).__name__, str(exc)))
    finally:
        session.close()


def test_concurrency():
    # 1. Create a brand-new user with NO existing ai_review_usage row
    db = SessionLocal()
    uid_hex = uuid.uuid4().hex[:8]
    test_user = User(
        clerk_id=f"test_proc_{uid_hex}",
        email=f"proc_{uid_hex}@example.com",
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    user_id = test_user.id

    # Verify no ai_review_usage row exists yet
    existing_row = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == user_id).first()
    assert existing_row is None, "Precondition failed: ai_review_usage row already exists!"
    db.close()

    print(f"Created brand new user {user_id} with 0 existing usage rows.")

    # 2. Launch 10 simultaneous processes
    queue = multiprocessing.Queue()
    procs = [
        multiprocessing.Process(target=run_limiter_request, args=(user_id, queue))
        for _ in range(10)
    ]

    for p in procs:
        p.start()
    for p in procs:
        p.join()

    # 3. Collect results
    results = []
    while not queue.empty():
        results.append(queue.get())

    successes = sum(1 for r in results if r[0] == "OK")
    blocked = sum(1 for r in results if r[0] == "429")
    errors = sum(1 for r in results if r[0] == "ERR")

    print(f"Total results: {len(results)}")
    print(f"Successes: {successes}")
    print(f"Rate limited (429): {blocked}")
    print(f"Errors (500 / IntegrityError): {errors}")
    for idx, r in enumerate(results, 1):
        print(f"  Request {idx}: {r}")

    # Assertions
    assert len(results) == 10, f"Expected 10 results, got {len(results)}"
    assert successes <= 3, f"Expected at most 3 successes, got {successes}"
    assert errors == 0, f"Expected 0 errors/IntegrityError, got {errors}"
    assert blocked >= 7, f"Expected at least 7 blocked requests, got {blocked}"
    print("ALL REAL POSTGRES CONCURRENCY ASSERTIONS PASSED!")


if __name__ == "__main__":
    test_concurrency()
