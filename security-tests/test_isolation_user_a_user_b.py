import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.main import app
from app.database import Base
from app.deps import get_db
from app.models import User, Portfolio
from app.security import get_current_user
SQLALCHEMY_DATABASE_URL = 'sqlite:///:memory:'
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
_current_mock_user = {'sub': 'user_A_clerk_123', 'email': 'userA@example.com', 'username': 'user_a'}

def override_get_current_user():
    return _current_mock_user

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
client = TestClient(app)

class UserIsolationTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        global _current_mock_user
        _current_mock_user = {'sub': 'user_A_clerk_123', 'email': 'userA@example.com', 'username': 'user_a'}
        res_a = client.get('/api/auth/me')
        cls.user_a_id = res_a.json()['id']
        _current_mock_user = {'sub': 'user_B_clerk_456', 'email': 'userB@example.com', 'username': 'user_b'}
        res_b = client.get('/api/auth/me')
        cls.user_b_username = res_b.json()['username']
        cls.user_b_id = res_b.json()['id']
        res_p = client.post('/api/portfolio/me', json={'title': 'User B Secret Portfolio', 'summary': 'Confidential work by User B', 'sections': {'meta': {'templateId': 'simple'}, 'profile': {'fullName': 'User B'}}, 'projects': [{'title': 'Project B', 'description': 'Proprietary code'}]})
        cls.portfolio_b = res_p.json()
        cls.portfolio_b_id = cls.portfolio_b['id']
        cls.portfolio_b_slug = cls.portfolio_b['slug']
        db.close()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        global _current_mock_user
        _current_mock_user = {'sub': 'user_A_clerk_123', 'email': 'userA@example.com', 'username': 'user_a'}

    def test_01_auth_me_get_isolation(self):
        res = client.get('/api/auth/me')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['clerk_id'], 'user_A_clerk_123')
        self.assertEqual(data['id'], self.user_a_id)

    def test_02_auth_me_put_cannot_modify_other_user(self):
        res = client.put('/api/auth/me', json={'username': 'user_a_updated'})
        self.assertEqual(res.status_code, 200)
        global _current_mock_user
        _current_mock_user = {'sub': 'user_B_clerk_456'}
        res_b = client.get('/api/auth/me')
        self.assertEqual(res_b.json()['username'], self.user_b_username)

    def test_03_portfolio_me_get_isolation(self):
        res = client.get('/api/portfolio/me')
        self.assertEqual(res.status_code, 200)
        portfolios = res.json()
        for p in portfolios:
            self.assertEqual(p['user_id'], self.user_a_id)
            self.assertNotEqual(p['id'], self.portfolio_b_id)

    def test_04_portfolio_id_get_idor_blocked(self):
        res = client.get(f'/api/portfolio/{self.portfolio_b_id}')
        self.assertEqual(res.status_code, 404)

    def test_05_portfolio_me_post_cannot_overwrite_other_user(self):
        res = client.post(f'/api/portfolio/me?portfolio_id={self.portfolio_b_id}', json={'title': 'Hacked Title', 'summary': 'Attempting IDOR overwrite'})
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json().get('detail'), 'Portfolio not found.')
        global _current_mock_user
        _current_mock_user = {'sub': 'user_B_clerk_456'}
        res_b = client.get(f'/api/portfolio/{self.portfolio_b_id}')
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.json()['title'], 'User B Secret Portfolio')
        self.assertEqual(res_b.json()['summary'], 'Confidential work by User B')

    def test_06_portfolio_id_put_idor_blocked(self):
        res = client.put(f'/api/portfolio/{self.portfolio_b_id}', json={'title': 'Malicious Edit'})
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json().get('detail'), 'Portfolio not found.')

    def test_07_portfolio_id_delete_idor_blocked(self):
        res = client.delete(f'/api/portfolio/{self.portfolio_b_id}')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json().get('detail'), 'Portfolio not found.')
        global _current_mock_user
        _current_mock_user = {'sub': 'user_B_clerk_456'}
        res_b = client.get(f'/api/portfolio/{self.portfolio_b_id}')
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.json()['title'], 'User B Secret Portfolio')
        self.assertEqual(res_b.json()['id'], self.portfolio_b_id)

    def test_08_image_delete_blocks_other_user_file_deletion(self):
        res = client.delete(f'/api/portfolio/images/{self.user_b_id}/secret_image.png')
        self.assertEqual(res.status_code, 403)
        self.assertIn('own', res.json()['detail'].lower())

    def test_09_review_idor_blocked(self):
        res = client.post(f'/api/portfolio/review?portfolio_id={self.portfolio_b_id}', json={'title': 'User A Portfolio', 'summary': 'User A summary with adequate length for review validation', 'sections': {'meta': {'templateId': 'simple'}, 'skills': ['Python', 'Security']}, 'projects': [{'title': 'Project A', 'description': 'Secure app'}]})
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json().get('detail'), 'Portfolio not found.')
        global _current_mock_user
        _current_mock_user = {'sub': 'user_B_clerk_456'}
        res_b = client.get(f'/api/portfolio/{self.portfolio_b_id}')
        self.assertEqual(res_b.status_code, 200)
        self.assertIsNone(res_b.json().get('review'))
        self.assertEqual(res_b.json()['title'], 'User B Secret Portfolio')

    def test_10_draft_check_isolated(self):
        res = client.post('/api/portfolio/draft-check', json={'title': 'Draft Portfolio', 'sections': {'profile': {'fullName': 'Candidate A'}}})
        self.assertEqual(res.status_code, 200)
        self.assertIn('score', res.json())

    def test_11_public_portfolio_privacy_respected(self):
        global _current_mock_user
        _current_mock_user = {'sub': 'user_B_clerk_456'}
        client.put('/api/auth/me', json={'settings': {'publicLink': False}})
        res_pub = client.get(f'/api/portfolio/public/{self.portfolio_b_slug}')
        res_missing = client.get('/api/portfolio/public/definitely-missing-slug-zzzz')
        self.assertEqual(res_pub.status_code, 404)
        self.assertEqual(res_missing.status_code, 404)
        self.assertEqual(res_pub.json().get('detail'), 'Portfolio not found.')
        self.assertEqual(res_pub.json(), res_missing.json())

    def test_12_public_portfolio_permanent_access(self):
        global _current_mock_user
        _current_mock_user = {'sub': 'user_A_clerk_123', 'email': 'userA@example.com', 'username': 'user_a'}
        res_settings = client.put('/api/auth/me', json={'username': 'user_a_permanent', 'settings': {'publicLink': True}})
        self.assertEqual(res_settings.status_code, 200)
        self.assertTrue(res_settings.json().get('settings', {}).get('publicLink') is True)
        res = client.post('/api/portfolio/me', json={'title': 'User A Public Portfolio', 'summary': 'Public portfolio for User A', 'sections': {'meta': {'templateId': 'simple'}, 'profile': {'fullName': 'User A'}}, 'projects': [{'title': 'Project A', 'description': 'Public project'}]})
        self.assertEqual(res.status_code, 200)
        p_data = res.json()
        p_id = p_data['id']
        p_slug = p_data['slug']
        res_slug = client.get(f'/api/portfolio/public/{p_slug}')
        self.assertEqual(res_slug.status_code, 200)
        slug_body = res_slug.json()
        self.assertEqual(slug_body['title'], 'User A Public Portfolio')
        self.assertEqual(slug_body['slug'], p_slug)
        self.assertFalse(slug_body.get('is_owner'))
        self.assertIsNone(slug_body.get('id'))
        res_id = client.get(f'/api/portfolio/public/{p_id}')
        self.assertEqual(res_id.status_code, 404)
        self.assertEqual(res_id.json().get('detail'), 'Portfolio not found.')
        res_user = client.get('/api/portfolio/public/user_a_permanent')
        self.assertEqual(res_user.status_code, 404)
        self.assertEqual(res_user.json().get('detail'), 'Portfolio not found.')
        res_me = client.get('/api/auth/me')
        self.assertEqual(res_me.status_code, 200)
        self.assertTrue(res_me.json().get('settings', {}).get('publicLink') is True)
if __name__ == '__main__':
    unittest.main()
