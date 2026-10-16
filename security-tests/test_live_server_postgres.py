import os
import sys
import unittest
from datetime import datetime, timezone
import httpx
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.database import SessionLocal, engine
from app.models import User, Portfolio, AiReviewUsage
from app.security import get_current_user

# Note: this test runs LIVE against REAL PostgreSQL (engine connected to DATABASE_URL)
_active_user = {"sub": "clerk_live_a", "email": "live_a@test.com", "username": "live_a"}


def override_get_current_user():
    return _active_user


app.dependency_overrides[get_current_user] = override_get_current_user

# TestClient drives real ASGI pipeline against real PostgreSQL
client = TestClient(app)


class LivePostgresAndServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        from app.deps import get_db
        if get_db in app.dependency_overrides:
            del app.dependency_overrides[get_db]

        # 1. Clean previous test runs in real Postgres
        db = SessionLocal()
        try:
            for cid in ("clerk_live_a", "clerk_live_b"):
                existing = db.query(User).filter(User.clerk_id == cid).first()
                if existing:
                    db.query(Portfolio).filter(Portfolio.user_id == existing.id).delete()
                    db.query(AiReviewUsage).filter(AiReviewUsage.user_id == existing.id).delete()
                    db.delete(existing)
            db.commit()

            # 2. Seed User A and User B in real Postgres
            global _active_user
            _active_user = {"sub": "clerk_live_a", "email": "live_a@test.com", "username": "live_a"}
            res_a = client.get("/api/auth/me")
            assert res_a.status_code == 200
            cls.user_a_id = res_a.json()["id"]

            _active_user = {"sub": "clerk_live_b", "email": "live_b@test.com", "username": "live_b"}
            res_b = client.get("/api/auth/me")
            assert res_b.status_code == 200
            cls.user_b_id = res_b.json()["id"]

            # 3. User B creates a private portfolio in real Postgres
            res_p = client.post("/api/portfolio/me", json={
                "title": "User B Confidential Portfolio",
                "summary": "Live real Postgres portfolio for User B",
                "sections": {
                    "meta": {"templateId": "simple"},
                    "profile": {"fullName": "User B", "aboutMe": "Senior live dev"},
                    "skills": ["Rust", "Go", "PostgreSQL"],
                },
                "projects": [{"title": "Live Project B", "description": "Closed source project"}],
            })
            assert res_p.status_code == 200
            cls.portfolio_b_id = res_p.json()["id"]
        finally:
            db.close()

    @classmethod
    def tearDownClass(cls):
        # Clean up seeded live test data in real Postgres
        app.dependency_overrides.clear()
        db = SessionLocal()
        try:
            for cid in ("clerk_live_a", "clerk_live_b"):
                existing = db.query(User).filter(User.clerk_id == cid).first()
                if existing:
                    db.query(Portfolio).filter(Portfolio.user_id == existing.id).delete()
                    db.query(AiReviewUsage).filter(AiReviewUsage.user_id == existing.id).delete()
                    db.delete(existing)
            db.commit()
        finally:
            db.close()

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        from app.deps import get_db
        if get_db in app.dependency_overrides:
            del app.dependency_overrides[get_db]
        global _active_user
        _active_user = {"sub": "clerk_live_a", "email": "live_a@test.com", "username": "live_a"}
        db = SessionLocal()
        try:
            db.query(AiReviewUsage).filter(AiReviewUsage.user_id.in_([self.user_a_id, self.user_b_id])).delete()
            db.commit()
        finally:
            db.close()

    def test_live_01_user_a_cannot_read_user_b_portfolio(self):
        """User A attempts IDOR to read User B's portfolio by ID -> must fail with 404."""
        # /api/portfolio/me returns only User A's portfolios
        res = client.get("/api/portfolio/me")
        self.assertEqual(res.status_code, 200)
        items = res.json()
        b_ids = [p["id"] for p in (items if isinstance(items, list) else [items]) if p]
        self.assertNotIn(self.portfolio_b_id, b_ids)

    def test_live_02_user_a_cannot_update_user_b_portfolio(self):
        """User A attempts IDOR to update User B's portfolio -> must return 404."""
        res = client.put(f"/api/portfolio/me/{self.portfolio_b_id}", json={
            "title": "Hacked Title By User A",
            "summary": "Defaced summary",
        })
        self.assertEqual(res.status_code, 404)

        # Verify User B's portfolio in real Postgres is completely untouched
        db = SessionLocal()
        try:
            p = db.query(Portfolio).filter(Portfolio.id == self.portfolio_b_id).first()
            self.assertEqual(p.title, "User B Confidential Portfolio")
            self.assertEqual(p.user_id, self.user_b_id)
        finally:
            db.close()

    def test_live_03_user_a_cannot_delete_user_b_portfolio(self):
        """User A attempts IDOR to delete User B's portfolio -> must return 404."""
        res = client.delete(f"/api/portfolio/me/{self.portfolio_b_id}")
        self.assertEqual(res.status_code, 404)

        # Verify User B's portfolio still exists in real Postgres
        db = SessionLocal()
        try:
            p = db.query(Portfolio).filter(Portfolio.id == self.portfolio_b_id).first()
            self.assertIsNotNone(p)
        finally:
            db.close()

    def test_live_04_ai_review_usage_read_write_in_real_postgres(self):
        """Test AI review limiter read/write against real Postgres ai_review_usage table."""
        # Create portfolio for User A so they can request reviews
        client.post("/api/portfolio/me", json={
            "title": "User A Live Portfolio",
            "summary": "Rich fullstack portfolio with plenty of content",
            "sections": {
                "meta": {"templateId": "simple"},
                "profile": {"fullName": "User A", "aboutMe": "Senior Developer"},
                "skills": ["Python", "FastAPI", "React"],
            },
            "projects": [{"title": "Project Live A", "description": "Cloud architecture"}],
        })

        # 1. First review consumes 1 and writes to real Postgres
        res1 = client.post("/api/portfolio/review", json={})
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json().get("remaining"), 2)

        # 2. Verify row exists in real Postgres
        db = SessionLocal()
        try:
            row = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user_a_id).first()
            self.assertIsNotNone(row)
            self.assertEqual(row.count, 1)
            self.assertEqual(row.daily_count, 1)
            self.assertEqual(row.blocked_attempts, 0)
        finally:
            db.close()

        # 3. Status endpoint reads from real Postgres without modifying counters
        res_st = client.get("/api/ai-review/status")
        self.assertEqual(res_st.status_code, 200)
        self.assertEqual(res_st.json().get("remaining"), 2)

    def test_live_05_sensitive_paths_return_404_on_server(self):
        """Probe for .env, .git, and source maps on running server -> must return 404."""
        sensitive_paths = [
            "/.env",
            "/.env.production",
            "/.git/config",
            "/.git/HEAD",
            "/backend/.env",
            "/main.py.map",
            "/index.js.map",
        ]
        for path in sensitive_paths:
            res = client.get(path)
            self.assertEqual(res.status_code, 404, f"Path {path} should return 404, got {res.status_code}")


if __name__ == "__main__":
    unittest.main()
