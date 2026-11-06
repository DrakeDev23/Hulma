import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
BACKEND_DIR = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(BACKEND_DIR))
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
os.environ.setdefault('CLERK_ISSUER', 'https://clerk.test.example')
os.environ.setdefault('ALLOWED_ORIGINS', 'https://hulma.vercel.app,http://localhost:5173')
from app.main import app
from app.database import Base
from app.deps import get_db
from app.models import User, Portfolio
from app.routers.portfolio_auth import get_current_profile
engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
client = TestClient(app)

class TestPortfolioOwnershipAndHardening(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        cls.owner = User(clerk_id='user_owner_clerk_123', email='owner@example.com', username='owner_user', settings={'publicLink': True})
        cls.other_user = User(clerk_id='user_other_clerk_456', email='other@example.com', username='other_user', settings={})
        db.add(cls.owner)
        db.add(cls.other_user)
        db.commit()
        db.refresh(cls.owner)
        db.refresh(cls.other_user)
        cls.portfolio = Portfolio(user_id=cls.owner.id, title='Owner Portfolio', slug='owner-slug-123', sections={'meta': {'templateId': 'simple'}}, projects=[], views=0)
        db.add(cls.portfolio)
        db.commit()
        db.refresh(cls.portfolio)
        cls.portfolio_id = cls.portfolio.id
        cls.portfolio_slug = cls.portfolio.slug
        db.close()

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_db, None)

    def test_01_public_portfolio_owner_gets_is_owner_true(self):
        with patch('app.security.verify_clerk_jwt') as mock_jwt:
            mock_jwt.return_value = {'sub': 'user_owner_clerk_123'}
            res = client.get(f'/api/portfolio/public/{self.portfolio_slug}', headers={'Authorization': 'Bearer fake.owner.jwt'})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data['is_owner'], True)
            self.assertNotIn('owner_clerk_id', data)

    def test_02_public_portfolio_other_account_gets_is_owner_false(self):
        with patch('app.security.verify_clerk_jwt') as mock_jwt:
            mock_jwt.return_value = {'sub': 'user_other_clerk_456'}
            res = client.get(f'/api/portfolio/public/{self.portfolio_slug}', headers={'Authorization': 'Bearer fake.other.jwt'})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data['is_owner'], False)
            self.assertEqual(data['slug'], self.portfolio_slug)
            self.assertNotIn('owner_clerk_id', data)
            self.assertIsNone(data.get('id'))

    def test_03_public_portfolio_anonymous_incognito_gets_is_owner_false(self):
        res = client.get(f'/api/portfolio/public/{self.portfolio_slug}')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['is_owner'], False)
        self.assertEqual(data['slug'], self.portfolio_slug)
        self.assertNotIn('owner_clerk_id', data)
        self.assertIsNone(data.get('id'))

    def test_04_write_endpoints_without_token_return_401(self):
        res_post = client.post('/api/portfolio/me', json={'title': 'Unauthorized'})
        self.assertEqual(res_post.status_code, 401)
        res_put = client.put(f'/api/portfolio/{self.portfolio_id}', json={'title': 'Unauthorized'})
        self.assertEqual(res_put.status_code, 401)
        res_del = client.delete(f'/api/portfolio/{self.portfolio_id}')
        self.assertEqual(res_del.status_code, 401)

    def test_05_other_user_write_on_owner_portfolio_returns_403(self):

        def override_other_user():
            return self.other_user
        app.dependency_overrides[get_current_profile] = override_other_user
        try:
            res_put = client.put(f'/api/portfolio/{self.portfolio_id}', json={'title': 'Hacked Title'})
            self.assertEqual(res_put.status_code, 404)
            self.assertEqual(res_put.json().get('detail'), 'Portfolio not found.')
            res_del = client.delete(f'/api/portfolio/{self.portfolio_id}')
            self.assertEqual(res_del.status_code, 404)
            self.assertEqual(res_del.json().get('detail'), 'Portfolio not found.')
        finally:
            app.dependency_overrides.pop(get_current_profile, None)

        def override_owner():
            return self.owner
        app.dependency_overrides[get_current_profile] = override_owner
        try:
            res_original = client.get(f'/api/portfolio/{self.portfolio_id}')
            self.assertEqual(res_original.status_code, 200)
            self.assertEqual(res_original.json()['title'], 'Owner Portfolio')
            self.assertEqual(res_original.json()['sections']['meta']['templateId'], 'simple')
        finally:
            app.dependency_overrides.pop(get_current_profile, None)

    def test_06_create_multiple_portfolios_no_overwrite(self):

        def override_owner():
            return self.owner
        app.dependency_overrides[get_current_profile] = override_owner
        try:
            res_modern = client.post('/api/portfolio/me', json={'title': 'Modern Portfolio', 'summary': 'Modern summary', 'sections': {'meta': {'templateId': 'modern'}, 'profile': {'fullName': 'Owner Modern'}}, 'projects': [{'name': 'Modern App', 'description': 'React App'}]})
            self.assertEqual(res_modern.status_code, 200)
            modern_p = res_modern.json()
            self.assertNotEqual(modern_p['id'], self.portfolio_id)
            self.assertEqual(modern_p['sections']['meta']['templateId'], 'modern')
            res_original = client.get(f'/api/portfolio/{self.portfolio_id}')
            self.assertEqual(res_original.status_code, 200)
            self.assertEqual(res_original.json()['title'], 'Owner Portfolio')
            self.assertEqual(res_original.json()['sections']['meta']['templateId'], 'simple')
            res_modern2 = client.post('/api/portfolio/me', json={'title': 'Second Modern Portfolio', 'summary': 'Another modern summary', 'sections': {'meta': {'templateId': 'modern'}, 'profile': {'fullName': 'Owner Modern 2'}}, 'projects': []})
            self.assertEqual(res_modern2.status_code, 200)
            modern2_p = res_modern2.json()
            self.assertNotEqual(modern2_p['id'], modern_p['id'])
            self.assertNotEqual(modern2_p['id'], self.portfolio_id)
            res_all = client.get('/api/portfolio/me')
            self.assertEqual(res_all.status_code, 200)
            all_ids = [p['id'] for p in res_all.json()]
            self.assertIn(self.portfolio_id, all_ids)
            self.assertIn(modern_p['id'], all_ids)
            self.assertIn(modern2_p['id'], all_ids)
        finally:
            app.dependency_overrides.pop(get_current_profile, None)
