import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.database import Base
from app.deps import get_db
from app.models import User, Portfolio
from app.security import get_current_user

# Set up in-memory SQLite DB for isolation testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# Active test context
_current_mock_user = {"sub": "user_A_clerk_123", "email": "userA@example.com", "username": "user_a"}


def override_get_current_user():
    return _current_mock_user


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class UserIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()

        # Seed User A and User B
        global _current_mock_user
        _current_mock_user = {"sub": "user_A_clerk_123", "email": "userA@example.com", "username": "user_a"}
        res_a = client.get("/api/auth/me")
        cls.user_a_id = res_a.json()["id"]

        _current_mock_user = {"sub": "user_B_clerk_456", "email": "userB@example.com", "username": "user_b"}
        res_b = client.get("/api/auth/me")
        cls.user_b_username = res_b.json()["username"]
        cls.user_b_id = res_b.json()["id"]

        # User B creates a private portfolio
        res_p = client.post("/api/portfolio/me", json={
            "title": "User B Secret Portfolio",
            "summary": "Confidential work by User B",
            "sections": {"meta": {"templateId": "simple"}, "profile": {"fullName": "User B"}},
            "projects": [{"title": "Project B", "description": "Proprietary code"}],
        })
        cls.portfolio_b = res_p.json()
        cls.portfolio_b_id = cls.portfolio_b["id"]
        cls.portfolio_b_slug = cls.portfolio_b["slug"]
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        # Default caller is User A
        global _current_mock_user
        _current_mock_user = {"sub": "user_A_clerk_123", "email": "userA@example.com", "username": "user_a"}

    def test_01_auth_me_get_isolation(self):
        """GET /api/auth/me returns only caller identity"""
        res = client.get("/api/auth/me")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["clerk_id"], "user_A_clerk_123")
        self.assertEqual(data["id"], self.user_a_id)

    def test_02_auth_me_put_cannot_modify_other_user(self):
        """PUT /api/auth/me modifies only caller profile"""
        res = client.put("/api/auth/me", json={"username": "user_a_updated"})
        self.assertEqual(res.status_code, 200)

        # Verify User B was not affected
        global _current_mock_user
        _current_mock_user = {"sub": "user_B_clerk_456"}
        res_b = client.get("/api/auth/me")
        self.assertEqual(res_b.json()["username"], self.user_b_username)

    def test_03_portfolio_me_get_isolation(self):
        """GET /api/portfolio/me returns only caller's portfolios"""
        res = client.get("/api/portfolio/me")
        self.assertEqual(res.status_code, 200)
        portfolios = res.json()
        for p in portfolios:
            self.assertEqual(p["user_id"], self.user_a_id)
            self.assertNotEqual(p["id"], self.portfolio_b_id)

    def test_04_portfolio_id_get_idor_blocked(self):
        """GET /api/portfolio/{id} blocks User A accessing User B's portfolio"""
        res = client.get(f"/api/portfolio/{self.portfolio_b_id}")
        self.assertEqual(res.status_code, 404)

    def test_05_portfolio_me_post_cannot_overwrite_other_user(self):
        """POST /api/portfolio/me cannot overwrite User B's portfolio"""
        res = client.post(f"/api/portfolio/me?portfolio_id={self.portfolio_b_id}", json={
            "title": "Hacked Title",
            "summary": "Attempting IDOR overwrite",
        })
        self.assertEqual(res.status_code, 200)
        # Should have created or updated User A's portfolio, not User B's
        self.assertNotEqual(res.json()["id"], self.portfolio_b_id)

        # Check User B's portfolio title remains untouched
        global _current_mock_user
        _current_mock_user = {"sub": "user_B_clerk_456"}
        res_b = client.get(f"/api/portfolio/{self.portfolio_b_id}")
        self.assertEqual(res_b.json()["title"], "User B Secret Portfolio")

    def test_06_portfolio_id_put_idor_blocked(self):
        """PUT /api/portfolio/{id} blocks User A editing User B's portfolio"""
        res = client.put(f"/api/portfolio/{self.portfolio_b_id}", json={"title": "Malicious Edit"})
        self.assertEqual(res.status_code, 404)

    def test_07_portfolio_id_delete_idor_blocked(self):
        """DELETE /api/portfolio/{id} blocks User A deleting User B's portfolio"""
        res = client.delete(f"/api/portfolio/{self.portfolio_b_id}")
        self.assertEqual(res.status_code, 404)

    def test_08_image_delete_blocks_other_user_file_deletion(self):
        """DELETE /api/portfolio/images/{path} blocks User A deleting User B's image"""
        res = client.delete(f"/api/portfolio/images/{self.user_b_id}/secret_image.png")
        self.assertEqual(res.status_code, 403)
        self.assertIn("own", res.json()["detail"].lower())

    def test_09_review_idor_blocked(self):
        """POST /api/portfolio/review blocks User A targeting User B's portfolio ID"""
        # User A passing portfolio_id of User B cannot overwrite User B's review
        res = client.post(f"/api/portfolio/review?portfolio_id={self.portfolio_b_id}", json={
            "title": "User A Portfolio",
            "summary": "User A summary with adequate length for review validation",
            "sections": {"meta": {"templateId": "simple"}, "skills": ["Python", "Security"]},
            "projects": [{"title": "Project A", "description": "Secure app"}],
        })
        self.assertEqual(res.status_code, 200)

        # Check User B's review was NOT populated by User A
        global _current_mock_user
        _current_mock_user = {"sub": "user_B_clerk_456"}
        res_b = client.get(f"/api/portfolio/{self.portfolio_b_id}")
        self.assertIsNone(res_b.json().get("review"))

    def test_10_draft_check_isolated(self):
        """POST /api/portfolio/draft-check evaluates payload statelessly"""
        res = client.post("/api/portfolio/draft-check", json={
            "title": "Draft Portfolio",
            "sections": {"profile": {"fullName": "Candidate A"}},
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("score", res.json())

    def test_11_public_portfolio_privacy_respected(self):
        """GET /api/portfolio/public/{slug} blocks private portfolio when publicLink=False"""
        # User B disables publicLink
        global _current_mock_user
        _current_mock_user = {"sub": "user_B_clerk_456"}
        client.put("/api/auth/me", json={"settings": {"publicLink": False}})

        # Unauthenticated request for User B's slug must be blocked
        res_pub = client.get(f"/api/portfolio/public/{self.portfolio_b_slug}")
        self.assertEqual(res_pub.status_code, 403)
        self.assertIn("private", res_pub.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main()
