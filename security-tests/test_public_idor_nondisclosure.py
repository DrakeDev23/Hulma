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
from app.security import get_current_user
SQLALCHEMY_DATABASE_URL = 'sqlite:///:memory:'
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
_user = {'sub': 'pub_idor_owner', 'email': 'owner@example.com', 'username': 'pub_owner'}

def override_get_current_user():
    return _user

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
client = TestClient(app)

class PublicIdorNondisclosureTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        global _user
        _user = {'sub': 'pub_idor_owner', 'email': 'owner@example.com', 'username': 'pub_owner'}
        client.put('/api/auth/me', json={'settings': {'publicLink': False}, 'username': 'pub_owner'})
        res = client.post('/api/portfolio/me', json={'title': 'Private Only', 'summary': 'Should not be enumerable', 'sections': {'meta': {'templateId': 'simple'}}, 'projects': []})
        assert res.status_code == 200, res.text
        cls.slug = res.json()['slug']
        cls.pid = res.json()['id']
        _user = {'sub': 'pub_idor_other', 'email': 'other@example.com', 'username': 'pub_other'}
        client.get('/api/auth/me')

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        global _user
        _user = {'sub': 'pub_idor_other', 'email': 'other@example.com', 'username': 'pub_other'}

    def test_private_slug_and_missing_slug_indistinguishable(self):
        res_private = client.get(f'/api/portfolio/public/{self.slug}')
        res_missing = client.get('/api/portfolio/public/no-such-slug-xxxxxx')
        self.assertEqual(res_private.status_code, 404)
        self.assertEqual(res_missing.status_code, 404)
        self.assertEqual(res_private.json(), res_missing.json())

    def test_numeric_id_and_username_do_not_resolve(self):
        self.assertEqual(client.get(f'/api/portfolio/public/{self.pid}').status_code, 404)
        self.assertEqual(client.get('/api/portfolio/public/pub_owner').status_code, 404)

    def test_authenticated_non_owner_cannot_read_private_by_id(self):
        res = client.get(f'/api/portfolio/{self.pid}')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json().get('detail'), 'Portfolio not found.')

    def test_owner_can_preview_private_via_public_route_with_auth(self):
        global _user
        _user = {'sub': 'pub_idor_owner', 'email': 'owner@example.com', 'username': 'pub_owner'}
        res = client.get(f'/api/portfolio/{self.pid}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['title'], 'Private Only')
if __name__ == '__main__':
    unittest.main()
