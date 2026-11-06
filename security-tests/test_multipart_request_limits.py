import os
import sys
import unittest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.main import MAX_MULTIPART_BODY_BYTES, RequestSizeLimitMiddleware

async def _ok_app(scope, receive, send):
    while True:
        message = await receive()
        if message['type'] != 'http.request':
            break
        if not message.get('more_body', False):
            break
    await send({'type': 'http.response.start', 'status': 200, 'headers': [(b'content-type', b'text/plain')]})
    await send({'type': 'http.response.body', 'body': b'ok', 'more_body': False})
middleware = RequestSizeLimitMiddleware(_ok_app)

async def _call(headers, chunks):
    state = {'idx': 0}
    messages = []

    async def receive():
        i = state['idx']
        if i >= len(chunks):
            return {'type': 'http.request', 'body': b'', 'more_body': False}
        chunk = chunks[i]
        state['idx'] = i + 1
        return {'type': 'http.request', 'body': chunk, 'more_body': i < len(chunks) - 1}

    async def send(message):
        messages.append(message)
    scope = {'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': 'POST', 'scheme': 'http', 'path': '/api/portfolio/images/upload', 'raw_path': b'/api/portfolio/images/upload', 'query_string': b'', 'headers': headers, 'client': ('127.0.0.1', 123), 'server': ('test', 80)}
    await middleware(scope, receive, send)
    start = next((m for m in messages if m['type'] == 'http.response.start'))
    body = b''.join((m.get('body', b'') for m in messages if m['type'] == 'http.response.body'))
    return (start['status'], body)

class MultipartRequestLimitTests(unittest.IsolatedAsyncioTestCase):

    async def test_multipart_declared_oversize_rejected(self):
        status, body = await _call(headers=[(b'content-type', b'multipart/form-data; boundary=abc'), (b'content-length', str(MAX_MULTIPART_BODY_BYTES + 1).encode())], chunks=[b'--abc--'])
        self.assertEqual(status, 413)
        self.assertIn(b'Request body too large', body)

    async def test_multipart_stream_count_rejects_oversize_without_content_length(self):
        oversized = b'x' * (MAX_MULTIPART_BODY_BYTES + 100)
        mid = len(oversized) // 2
        status, body = await _call(headers=[(b'content-type', b'multipart/form-data; boundary=abc')], chunks=[oversized[:mid], oversized[mid:]])
        self.assertEqual(status, 413)
        self.assertIn(b'Request body too large', body)

    async def test_multipart_under_limit_allowed(self):
        status, body = await _call(headers=[(b'content-type', b'multipart/form-data; boundary=abc'), (b'content-length', b'20')], chunks=[b'--abc--'])
        self.assertEqual(status, 200)
        self.assertEqual(body, b'ok')

    async def test_multipart_client_disconnect_aborts_without_500(self):
        messages = []

        async def receive():
            return {'type': 'http.disconnect'}

        async def send(message):
            messages.append(message)
        scope = {'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': 'POST', 'scheme': 'http', 'path': '/api/portfolio/images/upload', 'raw_path': b'/api/portfolio/images/upload', 'query_string': b'', 'headers': [(b'content-type', b'multipart/form-data; boundary=abc')], 'client': ('127.0.0.1', 123), 'server': ('test', 80)}
        await middleware(scope, receive, send)
        starts = [m for m in messages if m['type'] == 'http.response.start']
        if starts:
            self.assertNotEqual(starts[0]['status'], 500)

    async def test_multipart_framing_headroom_is_above_per_file_cap(self):
        from app.config import settings
        per_file = max(1, int(settings.max_image_size_mb)) * 1024 * 1024
        self.assertGreater(MAX_MULTIPART_BODY_BYTES, per_file)
if __name__ == '__main__':
    unittest.main()
