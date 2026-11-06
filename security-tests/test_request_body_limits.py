import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.main import MAX_API_BODY_BYTES, RequestSizeLimitMiddleware, app
from app.database import Base
from app.deps import get_db
from app.routers.portfolio_images import MAX_IMAGE_BYTES
from app.security import get_current_user
SQLALCHEMY_DATABASE_URL = 'sqlite:///:memory:'
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
_mock_user = {'sub': 'body_limit_user', 'email': 'body@example.com', 'username': 'body_user'}

def override_get_current_user():
    return _mock_user

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
client = TestClient(app)

async def _ok_app(scope, receive, send):
    await send({'type': 'http.response.start', 'status': 200, 'headers': [(b'content-type', b'text/plain')]})
    await send({'type': 'http.response.body', 'body': b'ok', 'more_body': False})
middleware = RequestSizeLimitMiddleware(_ok_app)

async def _call_middleware(headers: list[tuple[bytes, bytes]], body_chunks: list[bytes]):
    state = {'idx': 0}
    messages = []

    async def receive():
        i = state['idx']
        if i >= len(body_chunks):
            return {'type': 'http.request', 'body': b'', 'more_body': False}
        chunk = body_chunks[i]
        state['idx'] = i + 1
        return {'type': 'http.request', 'body': chunk, 'more_body': i < len(body_chunks) - 1}

    async def send(message):
        messages.append(message)
    scope = {'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': 'POST', 'scheme': 'http', 'path': '/api/portfolio/draft-check', 'raw_path': b'/api/portfolio/draft-check', 'query_string': b'', 'headers': headers, 'client': ('127.0.0.1', 123), 'server': ('test', 80)}
    await middleware(scope, receive, send)
    start = next((m for m in messages if m['type'] == 'http.response.start'))
    body = b''.join((m.get('body', b'') for m in messages if m['type'] == 'http.response.body'))

    class _Resp:

        def __init__(self, status_code, body):
            self.status_code = status_code
            self.body = body
    return _Resp(start['status'], body)

class RequestBodyLimitTests(unittest.IsolatedAsyncioTestCase):

    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        client.get('/api/auth/me')

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

    async def test_declared_content_length_over_limit_rejected(self):
        response = await _call_middleware(headers=[(b'content-type', b'application/json'), (b'content-length', str(MAX_API_BODY_BYTES + 1).encode())], body_chunks=[b'{}'])
        self.assertEqual(response.status_code, 413)
        self.assertIn(b'Request body too large', response.body)

    async def test_invalid_content_length_rejected(self):
        response = await _call_middleware(headers=[(b'content-type', b'application/json'), (b'content-length', b'abc')], body_chunks=[b'{}'])
        self.assertEqual(response.status_code, 400)
        self.assertIn(b'Invalid Content-Length header', response.body)

    async def test_missing_content_length_still_enforces_actual_body_size(self):
        oversized = b'x' * (MAX_API_BODY_BYTES + 50)
        mid = len(oversized) // 2
        response = await _call_middleware(headers=[(b'content-type', b'application/json')], body_chunks=[oversized[:mid], oversized[mid:]])
        self.assertEqual(response.status_code, 413)
        self.assertIn(b'Request body too large', response.body)

    async def test_understated_content_length_cannot_bypass_with_large_body(self):
        oversized = b'y' * (MAX_API_BODY_BYTES + 20)
        response = await _call_middleware(headers=[(b'content-type', b'application/json'), (b'content-length', b'10')], body_chunks=[oversized])
        self.assertEqual(response.status_code, 413)

    async def test_small_body_without_content_length_allowed(self):
        response = await _call_middleware(headers=[(b'content-type', b'application/json')], body_chunks=[b'{"title":"ok"}'])
        self.assertEqual(response.status_code, 200)

    def test_small_json_endpoint_accepted(self):
        res = client.post('/api/portfolio/draft-check', json={'title': 'Small', 'sections': {'profile': {'fullName': 'Candidate'}}})
        self.assertEqual(res.status_code, 200)
        self.assertIn('score', res.json())

    def test_actual_oversized_json_body_rejected_via_http(self):
        huge_summary = 'x' * (MAX_API_BODY_BYTES + 1000)
        payload = ('{"title":"Big","summary":"' + huge_summary + '","sections":{"profile":{"fullName":"A"}},"projects":[]}').encode('utf-8')
        self.assertGreater(len(payload), MAX_API_BODY_BYTES)
        res = client.post('/api/portfolio/draft-check', content=payload, headers={'Content-Type': 'application/json'})
        self.assertEqual(res.status_code, 413)
        self.assertEqual(res.json().get('detail'), 'Request body too large.')

    def test_multipart_not_subject_to_json_body_ceiling(self):
        self.assertGreater(MAX_IMAGE_BYTES, 0)
        self.assertEqual(MAX_IMAGE_BYTES, 7 * 1024 * 1024)
        tiny_png = b'\x89PNG\r\n\x1a\n' + b'\x00' * 64
        res = client.post('/api/portfolio/images/upload', files={'file': ('tiny.png', tiny_png, 'image/png')})
        self.assertNotEqual(res.status_code, 413)
if __name__ == '__main__':
    unittest.main()
