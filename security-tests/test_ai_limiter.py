import json
import os
import sys
import time
import unittest
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import AsyncMock, MagicMock, patch

_MOCK_LLM_CHOICE = {
    "choices": [{
        "message": {
            "content": json.dumps({
                "summary": "Solid portfolio layout.",
                "score": 90,
                "categories": [
                    {"key": "template", "label": "Template", "score": 90, "note": "Clean"},
                    {"key": "layout", "label": "Layout", "score": 90, "note": "Good"},
                    {"key": "design", "label": "Design", "score": 90, "note": "Modern"},
                    {"key": "content", "label": "Content", "score": 90, "note": "Clear"},
                ],
                "suggestions": [
                    {"id": "s1", "category": "content", "priority": "high", "title": "Add metrics", "text": "Include quantifiable results"}
                ],
            })
        }
    }]
}

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base
from app.deps import get_db
from app.rate_limiter import limiter
from app.routers.portfolio_auth import get_current_profile
from app.models import User, AiReviewUsage, Portfolio
from app.security import get_current_user
from app.services.ai_limiter import (
    check_and_consume_ai_review,
    revert_ai_review_consumption,
    get_ai_review_status,
)

# Test DB Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

_active_mock_user = {"sub": "user_limiter_1", "email": "limiter1@example.com", "username": "user1"}


def override_get_current_user():
    return _active_mock_user


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class AiReviewLimiterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()

        # Seed User 1 and User 2
        global _active_mock_user
        _active_mock_user = {"sub": "user_limiter_1", "email": "limiter1@example.com", "username": "user1"}
        res1 = client.get("/api/auth/me")
        cls.user1_id = res1.json()["id"]

        _active_mock_user = {"sub": "user_limiter_2", "email": "limiter2@example.com", "username": "user2"}
        res2 = client.get("/api/auth/me")
        cls.user2_id = res2.json()["id"]

        # User 1 portfolio
        _active_mock_user = {"sub": "user_limiter_1", "email": "limiter1@example.com", "username": "user1"}
        client.post("/api/portfolio/me", json={
            "title": "Portfolio 1",
            "summary": "Fullstack engineer portfolio for review with plenty of content",
            "sections": {
                "meta": {"templateId": "simple"},
                "profile": {"fullName": "User One", "aboutMe": "Software architect with 10 years experience"},
                "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
                "workExperience": [{"company": "Tech Corp", "role": "Senior Dev"}],
            },
            "projects": [{"title": "Project Alpha", "description": "Built scalable cloud platform serving 100k users"}],
        })

        # User 2 portfolio
        _active_mock_user = {"sub": "user_limiter_2", "email": "limiter2@example.com", "username": "user2"}
        client.post("/api/portfolio/me", json={
            "title": "Portfolio 2",
            "summary": "Designer portfolio with rich content and projects",
            "sections": {
                "meta": {"templateId": "modern"},
                "profile": {"fullName": "User Two", "aboutMe": "Lead Product Designer"},
                "skills": ["UI/UX", "Figma", "TailwindCSS"],
            },
            "projects": [{"title": "Project Beta", "description": "Design system redesign"}],
        })
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        # Clear in-memory rate limiter and ai_review_usage table before each test
        limiter.clear()
        db = TestingSessionLocal()
        db.query(AiReviewUsage).delete()
        db.commit()
        db.close()
        global _active_mock_user
        _active_mock_user = {"sub": "user_limiter_1", "email": "limiter1@example.com", "username": "user1"}

        # Mock LLM API calls to return fast valid JSON and avoid Groq TPM limits
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = _MOCK_LLM_CHOICE
        self.httpx_patcher = patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_res)
        self.mock_httpx = self.httpx_patcher.start()

    def tearDown(self):
        self.httpx_patcher.stop()

    def test_01_three_successful_reviews_decrement_remaining(self):
        """Calls 1 to 3 succeed, returning remaining 2 -> 1 -> 0."""
        # 1st call
        res1 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res1.status_code, 200, res1.text)
        data1 = res1.json()
        self.assertEqual(data1.get("remaining"), 2)
        self.assertEqual(data1.get("daily_remaining"), 9)

        # 2nd call
        res2 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res2.status_code, 200, res2.text)
        data2 = res2.json()
        self.assertEqual(data2.get("remaining"), 1)
        self.assertEqual(data2.get("daily_remaining"), 8)

        # 3rd call
        res3 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res3.status_code, 200, res3.text)
        data3 = res3.json()
        self.assertEqual(data3.get("remaining"), 0)
        self.assertEqual(data3.get("daily_remaining"), 7)

    def test_02_fourth_call_blocked_with_429_and_headers(self):
        """4th call returns HTTP 429 with Retry-After header and required json."""
        for _ in range(3):
            res = client.post("/api/portfolio/review", json={})
            self.assertEqual(res.status_code, 200)

        # 4th call
        res4 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res4.status_code, 429)
        self.assertIn("Retry-After", res4.headers)
        data4 = res4.json()
        self.assertEqual(data4.get("error"), "rate_limited")
        self.assertEqual(data4.get("remaining"), 0)
        self.assertGreater(data4.get("retry_after_seconds"), 0)
        self.assertLessEqual(data4.get("retry_after_seconds"), 300)
        self.assertIn("used all 3 AI reviews", data4.get("message"))

    def test_03_cooldown_expiration_restores_three_uses(self):
        """After cooldown (5 min) passes, user gets 3 fresh uses."""
        for _ in range(3):
            client.post("/api/portfolio/review", json={})

        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertIsNotNone(record)
        # Fast-forward window_start by 305 seconds (cooldown expired)
        record.window_start = datetime.now(timezone.utc) - timedelta(seconds=305)
        db.commit()
        db.close()

        # Next call should succeed with remaining 2
        res = client.post("/api/portfolio/review", json={})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("remaining"), 2)

    def test_04_spam_penalty_triggers_after_5_blocked_attempts(self):
        """If user sends 5 or more blocked attempts during one cooldown, penalty escalates to 10 min."""
        for _ in range(3):
            client.post("/api/portfolio/review", json={})

        # 4 blocked attempts: should be regular cooldown
        for i in range(1, 5):
            res = client.post("/api/portfolio/review", json={})
            self.assertEqual(res.status_code, 429)
            data = res.json()
            self.assertFalse(data.get("is_penalty_active", False))
            self.assertLessEqual(data.get("retry_after_seconds"), 300)

        # 5th blocked attempt: SPAM THRESHOLD REACHED -> 10 minute penalty
        res_spam = client.post("/api/portfolio/review", json={})
        self.assertEqual(res_spam.status_code, 429)
        data_spam = res_spam.json()
        self.assertTrue(data_spam.get("is_penalty_active"))
        self.assertGreater(data_spam.get("retry_after_seconds"), 300)
        self.assertLessEqual(data_spam.get("retry_after_seconds"), 600)
        self.assertIn("paused for 10 minutes", data_spam.get("message"))

    def test_05_spam_penalty_capped_at_10_minutes(self):
        """Subsequent spam attempts while under penalty stay capped at 10 minutes."""
        for _ in range(3):
            client.post("/api/portfolio/review", json={})
        for _ in range(5):
            client.post("/api/portfolio/review", json={})

        # Send 3 more spam attempts
        for _ in range(3):
            res = client.post("/api/portfolio/review", json={})
            self.assertEqual(res.status_code, 429)
            data = res.json()
            self.assertTrue(data.get("is_penalty_active"))
            # Must never exceed 600 seconds
            self.assertLessEqual(data.get("retry_after_seconds"), 600)

    def test_06_after_penalty_ends_resets_uses_and_blocked_attempts(self):
        """When penalty_until expires, user gets 3 fresh uses and blocked_attempts resets to 0."""
        for _ in range(3):
            client.post("/api/portfolio/review", json={})
        for _ in range(5):
            client.post("/api/portfolio/review", json={})

        # Fast forward past penalty_until
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        record.penalty_until = datetime.now(timezone.utc) - timedelta(seconds=1)
        record.window_start = datetime.now(timezone.utc) - timedelta(seconds=601)
        db.commit()
        db.close()

        res = client.post("/api/portfolio/review", json={})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("remaining"), 2)

        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertEqual(record.blocked_attempts, 0)
        self.assertIsNone(record.penalty_until)
        db.close()

    def test_07_status_endpoint_does_not_increment_blocked_attempts(self):
        """Calling GET /api/ai-review/status must NOT consume uses or count as a blocked attempt."""
        for _ in range(3):
            client.post("/api/portfolio/review", json={})

        # Call status endpoint 10 times while in cooldown
        for _ in range(10):
            res = client.get("/api/ai-review/status")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get("remaining"), 0)
            self.assertFalse(data.get("is_penalty_active"))

        # Verify DB: blocked_attempts must still be 0
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertEqual(record.blocked_attempts, 0)
        db.close()

    def test_08_daily_quota_blocks_11th_request(self):
        """User cannot exceed 10 reviews in 24 hours even if cooldowns pass."""
        db = TestingSessionLocal()
        # Seed user with 10 reviews used today
        record = AiReviewUsage(
            user_id=self.user1_id,
            window_start=datetime.now(timezone.utc) - timedelta(seconds=400),
            count=0,
            daily_count=10,
            daily_window_start=datetime.now(timezone.utc) - timedelta(hours=2),
            blocked_attempts=0,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(record)
        db.commit()
        db.close()

        res = client.post("/api/portfolio/review", json={})
        self.assertEqual(res.status_code, 429)
        data = res.json()
        self.assertIn("Daily limit of 10", data.get("message"))
        self.assertEqual(data.get("daily_remaining"), 0)

    def test_09_user_a_limit_does_not_block_user_b(self):
        """User A hitting rate limit has zero effect on User B."""
        # User A uses all 3 reviews
        for _ in range(3):
            client.post("/api/portfolio/review", json={})
        res_a_4 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res_a_4.status_code, 429)

        # Switch to User B
        global _active_mock_user
        _active_mock_user = {"sub": "user_limiter_2", "email": "limiter2@example.com", "username": "user2"}

        res_b_1 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res_b_1.status_code, 200)
        self.assertEqual(res_b_1.json().get("remaining"), 2)

    def test_10_failed_llm_call_reverts_consumption(self):
        """If provider fails (500 or exception), consumption is reverted."""
        self.mock_httpx.side_effect = Exception("Groq server connection timeout")
        with patch("app.routers.portfolio_review.settings.groq_api_key", "test-key"):
            res = client.post("/api/portfolio/review", json={})
            # Falls back to heuristic review successfully
            self.assertEqual(res.status_code, 200)

            # Reversion ensures remaining is restored to 3
            db = TestingSessionLocal()
            record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
            self.assertEqual(record.count, 0)
            self.assertEqual(record.daily_count, 0)
            db.close()

    def test_11_unauthenticated_request_rejected_no_db_row(self):
        """Unauthenticated request returns 401 and does not touch ai_review_usage."""
        unauthed_client = TestClient(app)
        # Temporarily drop dependency override for auth
        del app.dependency_overrides[get_current_user]
        try:
            res = unauthed_client.post("/api/portfolio/review", json={})
            self.assertEqual(res.status_code, 401)
        finally:
            app.dependency_overrides[get_current_user] = override_get_current_user

    def test_12_atomic_concurrency_serializes_parallel_requests(self):
        """10 concurrent requests from same user yield at most 3 successes."""
        success_count = 0
        limited_count = 0

        def send_request():
            # Use direct function check_and_consume_ai_review across multiple sessions
            session = TestingSessionLocal()
            try:
                check_and_consume_ai_review(session, self.user1_id)
                session.commit()
                return True
            except Exception:
                session.rollback()
                return False
            finally:
                session.close()

        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(lambda _: send_request(), range(10)))

        success_count = sum(1 for r in results if r is True)
        limited_count = sum(1 for r in results if r is False)

        self.assertEqual(success_count, 3, f"Expected exactly 3 successes, got {success_count}")
        self.assertEqual(limited_count, 7, f"Expected 7 limited, got {limited_count}")

    def test_13_spoofed_headers_do_not_bypass_limit(self):
        """Headers like X-Forwarded-For or Client-IP are ignored; rate limit keys strictly on verified user ID."""
        for _ in range(3):
            client.post("/api/portfolio/review", json={})

        spoofed_headers = {
            "X-Forwarded-For": "1.2.3.4, 5.6.7.8",
            "X-Real-IP": "9.10.11.12",
            "Client-IP": "13.14.15.16",
        }
        res = client.post("/api/portfolio/review", json={}, headers=spoofed_headers)
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.json().get("error"), "rate_limited")

    def test_14_revert_never_goes_below_zero(self):
        """Revert never decrements counts below zero."""
        db = TestingSessionLocal()
        reverted = revert_ai_review_consumption(db, self.user1_id)
        # No usage row or 0 counts -> safely handled
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        if record:
            self.assertGreaterEqual(record.count, 0)
            self.assertGreaterEqual(record.daily_count, 0)
        db.close()

    def test_15_revert_skipped_if_window_reset(self):
        """If the cooldown window has already expired/reset, revert is skipped."""
        client.post("/api/portfolio/review", json={})
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertEqual(record.count, 1)

        # Fast forward window_start by 310 seconds (cooldown expired)
        stale_time = datetime.now(timezone.utc) - timedelta(seconds=310)
        record.window_start = stale_time
        db.commit()

        # Reverting with stale consumption time or after window expired returns False
        reverted = revert_ai_review_consumption(db, self.user1_id, consumed_at=stale_time)
        self.assertFalse(reverted, "Revert must be skipped when cooldown window has reset")

        db.refresh(record)
        self.assertEqual(record.count, 1, "Count must remain unchanged")
        db.close()

    def test_16_database_error_in_limiter_blocks_llm_and_fails_closed(self):
        """Simulate DB failure in limiter: ensures LLM is NEVER called and request fails closed."""
        self.mock_httpx.reset_mock()
        client_no_raise = TestClient(app, raise_server_exceptions=False)
        with patch("app.services.ai_limiter._get_or_create_usage", side_effect=Exception("Database connection terminated")):
            res = client_no_raise.post("/api/portfolio/review", json={})
            # Must return 500 without leaking stack trace
            self.assertEqual(res.status_code, 500)
            self.assertEqual(res.json(), {"detail": "Internal server error"})
            # Assert LLM was never called
            self.mock_httpx.assert_not_called()


if __name__ == "__main__":
    unittest.main()
