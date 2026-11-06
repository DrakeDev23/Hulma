import json
import os
import sys
import time
import unittest
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import AsyncMock, MagicMock, patch
_MOCK_LLM_CHOICE = {'choices': [{'message': {'content': json.dumps({'summary': 'Solid portfolio layout.', 'score': 90, 'categories': [{'key': 'template', 'label': 'Template', 'score': 90, 'note': 'Clean'}, {'key': 'layout', 'label': 'Layout', 'score': 90, 'note': 'Good'}, {'key': 'design', 'label': 'Design', 'score': 90, 'note': 'Modern'}, {'key': 'content', 'label': 'Content', 'score': 90, 'note': 'Clear'}], 'suggestions': [{'id': 's1', 'category': 'content', 'priority': 'high', 'title': 'Add metrics', 'text': 'Include quantifiable results'}]})}}]}
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.config import settings
from app.database import Base
from app.deps import get_db
from app.rate_limiter import limiter
from app.routers.portfolio_auth import get_current_profile
from app.models import User, AiReviewUsage, Portfolio
from app.security import get_current_user
from app.services.ai_limiter import check_and_consume_ai_review, revert_ai_review_consumption, get_ai_review_status
SQLALCHEMY_DATABASE_URL = 'sqlite:///:memory:'
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
_active_mock_user = {'sub': 'user_limiter_1', 'email': 'limiter1@example.com', 'username': 'user1'}

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
        global _active_mock_user
        _active_mock_user = {'sub': 'user_limiter_1', 'email': 'limiter1@example.com', 'username': 'user1'}
        res1 = client.get('/api/auth/me')
        cls.user1_id = res1.json()['id']
        _active_mock_user = {'sub': 'user_limiter_2', 'email': 'limiter2@example.com', 'username': 'user2'}
        res2 = client.get('/api/auth/me')
        cls.user2_id = res2.json()['id']
        _active_mock_user = {'sub': 'user_limiter_1', 'email': 'limiter1@example.com', 'username': 'user1'}
        client.post('/api/portfolio/me', json={'title': 'Portfolio 1', 'summary': 'Fullstack engineer portfolio for review with plenty of content', 'sections': {'meta': {'templateId': 'simple'}, 'profile': {'fullName': 'User One', 'aboutMe': 'Software architect with 10 years experience'}, 'skills': ['Python', 'FastAPI', 'React', 'PostgreSQL'], 'workExperience': [{'company': 'Tech Corp', 'role': 'Senior Dev'}]}, 'projects': [{'title': 'Project Alpha', 'description': 'Built scalable cloud platform serving 100k users'}]})
        _active_mock_user = {'sub': 'user_limiter_2', 'email': 'limiter2@example.com', 'username': 'user2'}
        client.post('/api/portfolio/me', json={'title': 'Portfolio 2', 'summary': 'Designer portfolio with rich content and projects', 'sections': {'meta': {'templateId': 'modern'}, 'profile': {'fullName': 'User Two', 'aboutMe': 'Lead Product Designer'}, 'skills': ['UI/UX', 'Figma', 'TailwindCSS']}, 'projects': [{'title': 'Project Beta', 'description': 'Design system redesign'}]})
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        limiter.clear()
        db = TestingSessionLocal()
        db.query(AiReviewUsage).delete()
        db.commit()
        db.close()
        global _active_mock_user
        _active_mock_user = {'sub': 'user_limiter_1', 'email': 'limiter1@example.com', 'username': 'user1'}
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = _MOCK_LLM_CHOICE
        self.httpx_patcher = patch('httpx.AsyncClient.post', new_callable=AsyncMock, return_value=mock_res)
        self.mock_httpx = self.httpx_patcher.start()

    def tearDown(self):
        self.httpx_patcher.stop()

    def test_01_five_successful_reviews_decrement_remaining(self):
        expected_remaining = [4, 3, 2, 1, 0]
        for idx, exp in enumerate(expected_remaining, 1):
            res = client.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 200, f'Call {idx} failed: {res.text}')
            data = res.json()
            self.assertEqual(data.get('remaining'), exp, f'Call {idx} expected remaining {exp}')
            self.assertEqual(data.get('daily_remaining'), settings.max_reviews_per_day - idx)
            if exp == 0:
                self.assertGreater(data.get('retry_after_seconds', 0), 17000)

    def test_02_sixth_call_blocked_with_429_and_headers(self):
        for _ in range(5):
            res = client.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 200)
        res6 = client.post('/api/portfolio/review', json={})
        self.assertEqual(res6.status_code, 429)
        self.assertIn('Retry-After', res6.headers)
        data6 = res6.json()
        self.assertEqual(data6.get('error'), 'rate_limited')
        self.assertEqual(data6.get('remaining'), 0)
        self.assertGreater(data6.get('retry_after_seconds'), 0)
        self.assertLessEqual(data6.get('retry_after_seconds'), 18000)
        self.assertIn('trials', data6.get('message'))

    def test_03_cooldown_expiration_restores_five_uses(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertIsNotNone(record)
        record.window_start = datetime.now(timezone.utc) - timedelta(seconds=18005)
        record.daily_window_start = datetime.now(timezone.utc) - timedelta(seconds=18005)
        db.commit()
        db.close()
        res = client.post('/api/portfolio/review', json={})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get('remaining'), 4)

    def test_04_spam_penalty_triggers_after_5_blocked_attempts(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        for i in range(1, 5):
            res = client.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 429)
            data = res.json()
            self.assertFalse(data.get('is_penalty_active', False))
            self.assertLessEqual(data.get('retry_after_seconds'), 18000)
        res_spam = client.post('/api/portfolio/review', json={})
        self.assertEqual(res_spam.status_code, 429)
        data_spam = res_spam.json()
        self.assertTrue(data_spam.get('is_penalty_active'))
        self.assertGreater(data_spam.get('retry_after_seconds'), 17000)
        self.assertLessEqual(data_spam.get('retry_after_seconds'), 18000)
        self.assertIn('Too many attempts', data_spam.get('message'))

    def test_05_spam_penalty_capped_at_cooldown_or_higher(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        for _ in range(3):
            res = client.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 429)
            data = res.json()
            self.assertTrue(data.get('is_penalty_active'))
            self.assertLessEqual(data.get('retry_after_seconds'), 18000)

    def test_06_after_penalty_ends_resets_uses_and_blocked_attempts(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        record.penalty_until = datetime.now(timezone.utc) - timedelta(seconds=1)
        record.window_start = datetime.now(timezone.utc) - timedelta(seconds=18001)
        record.daily_window_start = datetime.now(timezone.utc) - timedelta(seconds=18001)
        db.commit()
        db.close()
        res = client.post('/api/portfolio/review', json={})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get('remaining'), 4)
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertEqual(record.blocked_attempts, 0)
        self.assertIsNone(record.penalty_until)
        db.close()

    def test_07_status_endpoint_does_not_increment_blocked_attempts(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        for _ in range(10):
            res = client.get('/api/ai-review/status')
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get('remaining'), 0)
            self.assertFalse(data.get('is_penalty_active'))
            self.assertGreater(data.get('retry_after_seconds'), 0)
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertEqual(record.blocked_attempts, 0)
        db.close()

    def test_08_daily_quota_blocks_6th_request(self):
        db = TestingSessionLocal()
        record = AiReviewUsage(user_id=self.user1_id, window_start=datetime.now(timezone.utc) - timedelta(seconds=400), count=5, daily_count=5, daily_window_start=datetime.now(timezone.utc) - timedelta(hours=2), blocked_attempts=0, updated_at=datetime.now(timezone.utc))
        db.add(record)
        db.commit()
        db.close()
        res = client.post('/api/portfolio/review', json={})
        self.assertEqual(res.status_code, 429)
        data = res.json()
        self.assertEqual(data.get('remaining'), 0)

    def test_09_user_a_limit_does_not_block_user_b(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        res_a_6 = client.post('/api/portfolio/review', json={})
        self.assertEqual(res_a_6.status_code, 429)
        global _active_mock_user
        _active_mock_user = {'sub': 'user_limiter_2', 'email': 'limiter2@example.com', 'username': 'user2'}
        res_b_1 = client.post('/api/portfolio/review', json={})
        self.assertEqual(res_b_1.status_code, 200)
        self.assertEqual(res_b_1.json().get('remaining'), 4)

    def test_10_fallback_mode_consumes_quota_without_revert(self):
        self.mock_httpx.side_effect = Exception('Groq server connection timeout')
        with patch('app.routers.portfolio_review.settings.groq_api_key', 'test-key'):
            res = client.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 200)
            db = TestingSessionLocal()
            record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
            self.assertEqual(record.count, 1)
            self.assertEqual(record.daily_count, 1)
            db.close()

    def test_11_unauthenticated_request_rejected_no_db_row(self):
        unauthed_client = TestClient(app)
        del app.dependency_overrides[get_current_user]
        try:
            res = unauthed_client.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 401)
        finally:
            app.dependency_overrides[get_current_user] = override_get_current_user

    def test_12_atomic_concurrency_serializes_parallel_requests(self):
        success_count = 0
        limited_count = 0

        def send_request():
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
        success_count = sum((1 for r in results if r is True))
        limited_count = sum((1 for r in results if r is False))
        self.assertEqual(success_count, 5, f'Expected exactly 5 successes, got {success_count}')
        self.assertEqual(limited_count, 5, f'Expected 5 limited, got {limited_count}')

    def test_13_spoofed_headers_do_not_bypass_limit(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        spoofed_headers = {'X-Forwarded-For': '1.2.3.4, 5.6.7.8', 'X-Real-IP': '9.10.11.12', 'Client-IP': '13.14.15.16'}
        res = client.post('/api/portfolio/review', json={}, headers=spoofed_headers)
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.json().get('error'), 'rate_limited')

    def test_14_revert_never_goes_below_zero(self):
        db = TestingSessionLocal()
        reverted = revert_ai_review_consumption(db, self.user1_id)
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        if record:
            self.assertGreaterEqual(record.count, 0)
            self.assertGreaterEqual(record.daily_count, 0)
        db.close()

    def test_15_revert_skipped_if_window_reset(self):
        client.post('/api/portfolio/review', json={})
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        self.assertEqual(record.count, 1)
        stale_time = datetime.now(timezone.utc) - timedelta(seconds=18005)
        record.window_start = stale_time
        db.commit()
        reverted = revert_ai_review_consumption(db, self.user1_id, consumed_at=stale_time)
        self.assertFalse(reverted, 'Revert must be skipped when cooldown window has reset')
        db.refresh(record)
        self.assertEqual(record.count, 1, 'Count must remain unchanged')
        db.close()

    def test_16_database_error_in_limiter_blocks_llm_and_fails_closed(self):
        self.mock_httpx.reset_mock()
        client_no_raise = TestClient(app, raise_server_exceptions=False)
        with patch('app.services.ai_limiter._get_or_create_usage', side_effect=Exception('Database connection terminated')):
            res = client_no_raise.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 500)
            self.assertEqual(res.json(), {'detail': 'Internal server error'})
            self.mock_httpx.assert_not_called()

    def test_17_real_timer_persists_across_refreshes_and_logins(self):
        for _ in range(5):
            client.post('/api/portfolio/review', json={})
        status_res1 = client.get('/api/ai-review/status')
        self.assertEqual(status_res1.status_code, 200)
        data1 = status_res1.json()
        self.assertEqual(data1.get('remaining'), 0)
        initial_remaining_secs = data1.get('retry_after_seconds')
        self.assertGreater(initial_remaining_secs, 17000)
        self.assertLessEqual(initial_remaining_secs, 18000)
        db = TestingSessionLocal()
        record = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
        record.window_start = datetime.now(timezone.utc) - timedelta(seconds=3600)
        db.commit()
        db.close()
        status_res2 = client.get('/api/ai-review/status')
        self.assertEqual(status_res2.status_code, 200)
        data2 = status_res2.json()
        self.assertEqual(data2.get('remaining'), 0)
        self.assertGreater(data2.get('retry_after_seconds'), 14000)
        self.assertLessEqual(data2.get('retry_after_seconds'), 14405)
        global _active_mock_user
        _active_mock_user = {'sub': 'user_limiter_2', 'email': 'limiter2@example.com', 'username': 'user2'}
        user2_res = client.get('/api/ai-review/status')
        self.assertEqual(user2_res.json().get('remaining'), 5)
        _active_mock_user = {'sub': 'user_limiter_1', 'email': 'limiter1@example.com', 'username': 'user1'}
        status_res_after_relogin = client.get('/api/ai-review/status')
        data3 = status_res_after_relogin.json()
        self.assertEqual(data3.get('remaining'), 0)
        self.assertGreater(data3.get('retry_after_seconds'), 14000)
        self.assertLessEqual(data3.get('retry_after_seconds'), 14405)

    def test_16_database_error_in_limiter_blocks_llm_and_fails_closed(self):
        self.mock_httpx.reset_mock()
        client_no_raise = TestClient(app, raise_server_exceptions=False)
        with patch('app.services.ai_limiter._get_or_create_usage', side_effect=Exception('Database connection terminated')):
            res = client_no_raise.post('/api/portfolio/review', json={})
            self.assertEqual(res.status_code, 500)
            self.assertEqual(res.json(), {'detail': 'Internal server error'})
            self.mock_httpx.assert_not_called()

    def test_18_draft_check_and_review_share_limits_and_lockout(self):
        for i in range(3):
            res = client.post('/api/portfolio/draft-check', json={'title': f'Draft {i}', 'sections': {}})
            self.assertEqual(res.status_code, 200)
        res4 = client.post('/api/portfolio/review', json={})
        self.assertEqual(res4.status_code, 200)
        self.assertEqual(res4.json().get('remaining'), 1)
        res5 = client.post('/api/portfolio/review', json={})
        self.assertEqual(res5.status_code, 200)
        self.assertEqual(res5.json().get('remaining'), 0)
        self.assertGreater(res5.json().get('retry_after_seconds'), 17000)
        res6_draft = client.post('/api/portfolio/draft-check', json={'title': 'Draft 6'})
        self.assertEqual(res6_draft.status_code, 429)
        self.assertGreater(res6_draft.json().get('retry_after_seconds'), 17000)
        res7_review = client.post('/api/portfolio/review', json={})
        self.assertEqual(res7_review.status_code, 429)

    def test_19_daily_limit_status_reports_locked(self):
        now = datetime.now(timezone.utc)
        db = TestingSessionLocal()
        try:
            usage = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == self.user1_id).first()
            if not usage:
                usage = AiReviewUsage(user_id=self.user1_id, window_start=now, count=0, blocked_attempts=0, penalty_until=None, daily_count=25, daily_window_start=now, updated_at=now)
                db.add(usage)
            else:
                usage.daily_count = 25
                usage.count = 0
                usage.daily_window_start = now
            db.commit()
            status_res = get_ai_review_status(db, self.user1_id)
            self.assertEqual(status_res['remaining'], 0)
            self.assertEqual(status_res['daily_remaining'], 0)
            self.assertTrue(status_res['is_daily_limit'])
            self.assertIsNotNone(status_res['locked_until'])
            self.assertGreater(status_res['retry_after_seconds'], 0)
            res = client.get('/api/ai-review/status')
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()['remaining'], 0)
            self.assertEqual(res.json()['daily_remaining'], 0)
            self.assertTrue(res.json()['is_daily_limit'])
            self.assertIsNotNone(res.json()['locked_until'])
        finally:
            db.close()
if __name__ == '__main__':
    unittest.main()
