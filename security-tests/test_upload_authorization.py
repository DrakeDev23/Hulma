import io
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
BACKEND_DIR = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault('CLERK_ISSUER', 'https://clerk.test.example')
os.environ.setdefault('CLERK_JWKS_URL', 'https://clerk.test.example/.well-known/jwks.json')
os.environ.setdefault('ALLOWED_ORIGINS', 'https://hulma.vercel.app,http://localhost:5173')
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.config import settings
from app.database import Base
from app.deps import get_db
from app.main import app
from app.models import Portfolio, PortfolioProjectPhoto, User
from app.routers.portfolio_auth import get_current_profile
import base64
TINY_PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base.metadata.create_all(bind=engine)
_active_user: User | None = None

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_current_profile():
    if _active_user is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail='Missing bearer token')
    return _active_user
client = TestClient(app, raise_server_exceptions=False)

def _png_file():
    return ('tiny.png', io.BytesIO(TINY_PNG), 'image/png')

class UploadAuthorizationTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        cls.user_a = User(clerk_id='clerk_upload_a', email='upload_a@example.com', username='upload_a')
        cls.user_b = User(clerk_id='clerk_upload_b', email='upload_b@example.com', username='upload_b')
        db.add(cls.user_a)
        db.add(cls.user_b)
        db.commit()
        db.refresh(cls.user_a)
        db.refresh(cls.user_b)
        cls.portfolio_a = Portfolio(user_id=cls.user_a.id, title='A Portfolio', summary='Owned by A', sections={'meta': {'templateId': 'simple'}, 'profile': {}}, projects=[], slug='slug-upload-a', views=0, completion=0)
        cls.portfolio_b = Portfolio(user_id=cls.user_b.id, title='B Portfolio', summary='Owned by B', sections={'meta': {'templateId': 'simple'}, 'profile': {}}, projects=[], slug='slug-upload-b', views=0, completion=0)
        db.add(cls.portfolio_a)
        db.add(cls.portfolio_b)
        db.commit()
        db.refresh(cls.portfolio_a)
        db.refresh(cls.portfolio_b)
        db.close()
        settings.supabase_url = 'https://storage.test.example'
        settings.supabase_bucket = 'portfolio-images'
        settings.supabase_service_role_key = 'test-service-role-key-not-real'

    def setUp(self):
        global _active_user
        _active_user = self.user_a
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_profile] = override_get_current_profile

    def tearDown(self):
        global _active_user
        _active_user = None
        app.dependency_overrides.pop(get_current_profile, None)

    def test_unauthenticated_upload_rejected(self):
        app.dependency_overrides.pop(get_current_profile, None)
        from app.security import get_current_user

        def deny_user():
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail='Missing bearer token')
        app.dependency_overrides[get_current_user] = deny_user
        try:
            with patch('httpx.AsyncClient') as mock_client_cls:
                res = client.post(f'/api/portfolio/images/upload?portfolio_id={self.portfolio_a.id}', files={'file': _png_file()})
                self.assertEqual(res.status_code, 401)
                mock_client_cls.assert_not_called()
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides[get_current_profile] = override_get_current_profile

    def test_missing_portfolio_id_rejected_without_supabase_call(self):
        with patch('httpx.AsyncClient') as mock_client_cls:
            res = client.post('/api/portfolio/images/upload', files={'file': _png_file()})
            self.assertIn(res.status_code, {400, 422})
            mock_client_cls.assert_not_called()

    def test_user_a_cannot_upload_into_user_b_portfolio(self):
        with patch('httpx.AsyncClient') as mock_client_cls:
            res = client.post(f'/api/portfolio/images/upload?portfolio_id={self.portfolio_b.id}', files={'file': _png_file()})
            self.assertEqual(res.status_code, 404)
            self.assertEqual(res.json().get('detail'), 'Portfolio not found.')
            mock_client_cls.assert_not_called()

    def test_owned_portfolio_upload_succeeds_and_attaches(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'ok'
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock(return_value=mock_response)
        with patch('httpx.AsyncClient', return_value=mock_client):
            res = client.post(f'/api/portfolio/images/upload?portfolio_id={self.portfolio_a.id}', files={'file': _png_file()})
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertTrue(data['url'])
        self.assertTrue(data['path'].startswith(f'{self.user_a.id}/'))
        mock_client.post.assert_awaited()
        db = TestingSessionLocal()
        portfolio = db.query(Portfolio).filter(Portfolio.id == self.portfolio_a.id).one()
        profile = (portfolio.sections or {}).get('profile') or {}
        self.assertEqual(profile.get('profilePicture'), data['url'])
        db.close()

    def test_db_failure_triggers_storage_cleanup(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'ok'
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.delete = AsyncMock(return_value=MagicMock(status_code=200))
        with patch('httpx.AsyncClient', return_value=mock_client):
            with patch('app.routers.portfolio_images.flag_modified', side_effect=RuntimeError('simulated db attach failure')):
                res = client.post(f'/api/portfolio/images/upload?portfolio_id={self.portfolio_a.id}', files={'file': _png_file()})
        self.assertEqual(res.status_code, 500)
        mock_client.post.assert_awaited()
        mock_client.delete.assert_awaited()

    def test_storage_cleanup_failure_does_not_mask_original_error(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'ok'
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.delete = AsyncMock(side_effect=RuntimeError('cleanup unavailable'))
        with patch('httpx.AsyncClient', return_value=mock_client):
            with patch('app.routers.portfolio_images.flag_modified', side_effect=RuntimeError('simulated db attach failure')):
                res = client.post(f'/api/portfolio/images/upload?portfolio_id={self.portfolio_a.id}', files={'file': _png_file()})
        self.assertEqual(res.status_code, 500)

    def test_user_a_cannot_delete_user_b_image_path(self):
        other_path = f'{self.user_b.id}/secret.png'
        with patch('httpx.AsyncClient') as mock_client_cls:
            res = client.delete(f'/api/portfolio/images/{other_path}')
            self.assertEqual(res.status_code, 403)
            mock_client_cls.assert_not_called()

    def test_user_a_cannot_attach_user_b_storage_url_as_project_photo(self):
        foreign_url = f'https://storage.test.example/storage/v1/object/public/portfolio-images/{self.user_b.id}/stolen.png'
        with patch('httpx.AsyncClient') as mock_client_cls:
            res = client.post(f'/api/portfolio/{self.portfolio_a.id}/project-photos', data={'photo_url': foreign_url, 'project_name': 'Hack'})
            self.assertEqual(res.status_code, 403)
            mock_client_cls.assert_not_called()
        db = TestingSessionLocal()
        count = db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.photo_url == foreign_url).count()
        self.assertEqual(count, 0)
        db.close()
if __name__ == '__main__':
    unittest.main()
