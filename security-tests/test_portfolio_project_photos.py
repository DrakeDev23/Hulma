import os
import sys
import unittest
from pathlib import Path
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
from app.models import User, Portfolio, PortfolioProjectPhoto
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

class TestPortfolioProjectPhotos(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        cls.owner = User(clerk_id='user_owner_photos_1', email='owner_photos@example.com', username='owner_photos')
        cls.other_user = User(clerk_id='user_other_photos_2', email='other_photos@example.com', username='other_photos')
        db.add(cls.owner)
        db.add(cls.other_user)
        db.commit()
        db.refresh(cls.owner)
        db.refresh(cls.other_user)
        db.close()

    def setUp(self):

        def override_owner():
            return self.owner
        app.dependency_overrides[get_current_profile] = override_owner

    def tearDown(self):
        app.dependency_overrides.pop(get_current_profile, None)

    def test_01_create_portfolio_with_project_photo_syncs_to_table(self):
        payload = {'title': 'Developer Portfolio', 'summary': 'Showcasing projects with photos', 'sections': {'profile': {'fullName': 'Alex Developer', 'aboutMe': 'Senior engineer'}}, 'projects': [{'title': 'E-Commerce App', 'description': 'Next.js store', 'image': 'https://example.com/photos/ecommerce-preview.jpg'}, {'title': 'Analytics Dashboard', 'description': 'Real-time metrics', 'photo_url': 'https://example.com/photos/dashboard-preview.png'}, {'title': 'CLI Tool', 'description': 'Terminal utility with no image'}]}
        res = client.post('/api/portfolio/me', json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        portfolio_id = data['id']
        db = TestingSessionLocal()
        photos = db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.portfolio_id == portfolio_id).order_by(PortfolioProjectPhoto.project_index.asc()).all()
        self.assertEqual(len(photos), 2)
        self.assertEqual(photos[0].project_name, 'E-Commerce App')
        self.assertEqual(photos[0].photo_url, 'https://example.com/photos/ecommerce-preview.jpg')
        self.assertEqual(photos[0].project_index, 0)
        self.assertEqual(photos[0].user_id, self.owner.id)
        self.assertEqual(photos[1].project_name, 'Analytics Dashboard')
        self.assertEqual(photos[1].photo_url, 'https://example.com/photos/dashboard-preview.png')
        self.assertEqual(photos[1].project_index, 1)
        self.assertIn('project_photos', data)
        self.assertEqual(len(data['project_photos']), 2)
        db.close()

    def test_02_dedicated_add_project_photo_endpoint(self):
        res = client.post('/api/portfolio/me', json={'title': 'My Showcase', 'projects': [{'name': 'Mobile Chat App', 'description': 'React Native app'}]})
        portfolio_id = res.json()['id']
        photo_res = client.post(f'/api/portfolio/{portfolio_id}/project-photos', data={'project_name': 'Mobile Chat App', 'photo_url': 'https://example.com/photos/chat-app-mockup.webp', 'caption': 'Chat app mobile screen mockup', 'display_order': 1})
        self.assertEqual(photo_res.status_code, 200, photo_res.text)
        photo_data = photo_res.json()
        self.assertEqual(photo_data['project_name'], 'Mobile Chat App')
        self.assertEqual(photo_data['photo_url'], 'https://example.com/photos/chat-app-mockup.webp')
        self.assertEqual(photo_data['caption'], 'Chat app mobile screen mockup')
        photo_id = photo_data['id']
        list_res = client.get(f'/api/portfolio/{portfolio_id}/project-photos')
        self.assertEqual(list_res.status_code, 200)
        list_data = list_res.json()
        self.assertTrue(any((p['id'] == photo_id for p in list_data)))
        del_res = client.delete(f'/api/portfolio/project-photos/{photo_id}')
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json().get('deleted'))
        db = TestingSessionLocal()
        remaining = db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.id == photo_id).first()
        self.assertIsNone(remaining)
        db.close()

    def test_03_cascade_delete_portfolio_removes_project_photos(self):
        res = client.post('/api/portfolio/me', json={'title': 'Portfolio To Delete', 'projects': [{'name': 'Temp Project', 'image': 'https://example.com/temp.jpg'}]})
        portfolio_id = res.json()['id']
        db = TestingSessionLocal()
        count_before = db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.portfolio_id == portfolio_id).count()
        self.assertEqual(count_before, 1)
        del_res = client.delete(f'/api/portfolio/{portfolio_id}')
        self.assertEqual(del_res.status_code, 200)
        count_after = db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.portfolio_id == portfolio_id).count()
        self.assertEqual(count_after, 0)
        db.close()

    def test_04_other_user_cannot_modify_or_delete_project_photos(self):
        res = client.post('/api/portfolio/me', json={'title': 'Owner Private Portfolio'})
        portfolio_id = res.json()['id']
        photo_res = client.post(f'/api/portfolio/{portfolio_id}/project-photos', data={'project_name': 'Secret Project', 'photo_url': 'https://example.com/owner-photo.jpg'})
        photo_id = photo_res.json()['id']

        def override_other():
            return self.other_user
        app.dependency_overrides[get_current_profile] = override_other
        bad_add = client.post(f'/api/portfolio/{portfolio_id}/project-photos', data={'project_name': 'Injected Project', 'photo_url': 'https://example.com/hacked.jpg'})
        self.assertEqual(bad_add.status_code, 404)
        bad_del = client.delete(f'/api/portfolio/project-photos/{photo_id}')
        self.assertEqual(bad_del.status_code, 404)
if __name__ == '__main__':
    unittest.main()
