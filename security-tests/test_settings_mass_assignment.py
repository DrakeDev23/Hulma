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
from app.schemas import UserUpdate
from app.security import get_current_user
SQLALCHEMY_DATABASE_URL = 'sqlite:///:memory:'
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
_current_mock_user = {'sub': 'settings_user_a', 'email': 'a@example.com', 'username': 'settings_a'}

def override_get_current_user():
    return _current_mock_user

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
client = TestClient(app)

class SettingsMassAssignmentTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        global _current_mock_user
        _current_mock_user = {'sub': 'settings_user_a', 'email': 'a@example.com', 'username': 'settings_a'}
        client.get('/api/auth/me')
        _current_mock_user = {'sub': 'settings_user_b', 'email': 'b@example.com', 'username': 'settings_b'}
        client.get('/api/auth/me')

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        global _current_mock_user
        _current_mock_user = {'sub': 'settings_user_a', 'email': 'a@example.com', 'username': 'settings_a'}

    def test_schema_strips_unknown_settings_keys(self):
        model = UserUpdate(settings={'publicLink': True, 'tone': 'gentle', 'isAdmin': True, 'role': 'superuser', 'evilKey': {'nested': True}})
        self.assertEqual(model.settings.get('publicLink'), True)
        self.assertEqual(model.settings.get('tone'), 'gentle')
        self.assertNotIn('isAdmin', model.settings)
        self.assertNotIn('role', model.settings)
        self.assertNotIn('evilKey', model.settings)

    def test_schema_coerces_and_whitelists_allowed_fields(self):
        model = UserUpdate(settings={'publicLink': 'true', 'defaultTemplate': 'not-a-real-template', 'autoReview': 1, 'focus': ['layout', 'hacked', 'design'], 'tone': 'hostile'})
        self.assertTrue(model.settings['publicLink'] is True)
        self.assertEqual(model.settings['defaultTemplate'], 'simple')
        self.assertTrue(model.settings['autoReview'] is False)
        self.assertEqual(model.settings['focus'], ['layout', 'design'])
        self.assertEqual(model.settings['tone'], 'balanced')
        enabled = UserUpdate(settings={'autoReview': True})
        self.assertTrue(enabled.settings['autoReview'] is True)

    def test_api_allows_whitelisted_settings_update(self):
        res = client.put('/api/auth/me', json={'settings': {'publicLink': True, 'tone': 'direct', 'focus': ['content']}})
        self.assertEqual(res.status_code, 200)
        settings = res.json()['settings']
        self.assertTrue(settings.get('publicLink') is True)
        self.assertEqual(settings.get('tone'), 'direct')
        self.assertEqual(settings.get('focus'), ['content'])

    def test_api_ignores_unknown_settings_and_does_not_persist_them(self):
        res = client.put('/api/auth/me', json={'settings': {'publicLink': False, 'isAdmin': True, 'credits': 9999}})
        self.assertEqual(res.status_code, 200)
        settings = res.json()['settings']
        self.assertTrue(settings.get('publicLink') is False)
        self.assertNotIn('isAdmin', settings)
        self.assertNotIn('credits', settings)

    def test_user_cannot_modify_another_users_settings(self):
        res_a = client.put('/api/auth/me', json={'settings': {'tone': 'gentle'}})
        self.assertEqual(res_a.status_code, 200)
        global _current_mock_user
        _current_mock_user = {'sub': 'settings_user_b', 'email': 'b@example.com', 'username': 'settings_b'}
        res_b = client.put('/api/auth/me', json={'settings': {'tone': 'direct'}})
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.json()['settings'].get('tone'), 'direct')
        _current_mock_user = {'sub': 'settings_user_a', 'email': 'a@example.com', 'username': 'settings_a'}
        res_a2 = client.get('/api/auth/me')
        self.assertEqual(res_a2.status_code, 200)
        self.assertEqual(res_a2.json()['settings'].get('tone'), 'gentle')
        self.assertEqual(res_a2.json()['clerk_id'], 'settings_user_a')
if __name__ == '__main__':
    unittest.main()
