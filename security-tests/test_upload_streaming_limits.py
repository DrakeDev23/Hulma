import io
import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, UploadFile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.routers.portfolio_images import MAX_IMAGE_BYTES, _read_upload_limited, _validate_image_magic_bytes

class _FakeUpload:

    def __init__(self, data: bytes, chunk_size: int=64 * 1024):
        self._buf = io.BytesIO(data)
        self._chunk_size = chunk_size

    async def read(self, size: int=-1):
        if size is None or size < 0:
            size = self._chunk_size
        return self._buf.read(size)

class UploadStreamingLimitTests(unittest.IsolatedAsyncioTestCase):

    async def test_streaming_read_accepts_under_limit(self):
        payload = b'\x89PNG\r\n\x1a\n' + b'\x00' * 1000
        data = await _read_upload_limited(_FakeUpload(payload), MAX_IMAGE_BYTES)
        self.assertEqual(data, payload)

    async def test_streaming_read_rejects_over_limit_without_loading_entire_payload(self):
        oversized = b'\x00' * (MAX_IMAGE_BYTES + 10)
        with self.assertRaises(HTTPException) as ctx:
            await _read_upload_limited(_FakeUpload(oversized, chunk_size=1024), MAX_IMAGE_BYTES)
        self.assertEqual(ctx.exception.status_code, 413)

    def test_magic_bytes_override_claimed_mime(self):
        import base64
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
        self.assertEqual(_validate_image_magic_bytes(png), 'image/png')
        with self.assertRaises(HTTPException) as ctx:
            _validate_image_magic_bytes(b"<svg xmlns='http://www.w3.org/2000/svg'></svg>" + b'\x00' * 20)
        self.assertEqual(ctx.exception.status_code, 400)
if __name__ == '__main__':
    unittest.main()
