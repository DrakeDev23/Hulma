import logging
import re
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.database import engine
from app.deps import get_db
from app.models import User
from app.routers.portfolio_auth import get_current_profile
from app.routers.auth import router as auth_router
from app.routers.portfolio_images import router as portfolio_images_router
from app.routers.portfolio_core import router as portfolio_core_router
from app.routers.portfolio_review import router as portfolio_review_router
from app.schemas import AiReviewStatusResponse
from app.security import validate_auth_config
from app.services.ai_limiter import get_ai_review_status
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_auth_config()
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        logger.info('Database connection verified.')
    except Exception as exc:
        logger.error('Database connection check failed: %s', exc)
        raise
    yield

def should_enable_api_docs(app_env: str | None, debug: bool) -> bool:
    is_prod = (app_env or '').strip().lower() in {'production', 'prod'}
    return bool(debug) and (not is_prod)
_is_prod = (settings.app_env or '').strip().lower() in {'production', 'prod'}
_enable_docs = should_enable_api_docs(settings.app_env, settings.debug)
app = FastAPI(title=settings.app_name, version='1.0.0', debug=settings.debug and (not _is_prod), lifespan=lifespan, docs_url='/docs' if _enable_docs else None, redoc_url='/redoc' if _enable_docs else None, openapi_url='/openapi.json' if _enable_docs else None)
from starlette.middleware.base import BaseHTTPMiddleware
from app.rate_limiter import RateLimitMiddleware
MAX_API_BODY_BYTES = 1500000
_IMAGE_BYTES = max(1, int(settings.max_image_size_mb)) * 1024 * 1024
_MULTIPART_CONFIGURED = max(0, int(settings.max_multipart_body_mb)) * 1024 * 1024
MAX_MULTIPART_BODY_BYTES = _MULTIPART_CONFIGURED or _IMAGE_BYTES + 512 * 1024

def _configure_multipart_form_limits() -> None:
    from starlette.requests import Request
    original_form = Request.form
    max_part = MAX_MULTIPART_BODY_BYTES

    def form(self, *args, **kwargs):
        kwargs.setdefault('max_files', 5)
        kwargs.setdefault('max_fields', 40)
        kwargs.setdefault('max_part_size', max_part)
        return original_form(self, *args, **kwargs)
    Request.form = form
_configure_multipart_form_limits()

class BodyLimitExceeded(Exception):
    pass

class RequestSizeLimitMiddleware:

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return
        method = scope.get('method', 'GET').upper()
        if method not in {'POST', 'PUT', 'PATCH'}:
            await self.app(scope, receive, send)
            return
        headers = {key.decode('latin-1').lower(): value.decode('latin-1') for key, value in scope.get('headers', [])}
        content_type = headers.get('content-type', '').lower()
        is_multipart = 'multipart/form-data' in content_type
        max_bytes = MAX_MULTIPART_BODY_BYTES if is_multipart else MAX_API_BODY_BYTES
        content_length = headers.get('content-length')
        if content_length is not None:
            try:
                declared = int(content_length)
            except ValueError:
                await self._send_json(send, 400, {'detail': 'Invalid Content-Length header.'})
                return
            if declared < 0:
                await self._send_json(send, 400, {'detail': 'Invalid Content-Length header.'})
                return
            if declared > max_bytes:
                await self._send_json(send, 413, {'detail': 'Request body too large.'})
                return
        if is_multipart:
            total = 0
            response_started = False

            async def counted_receive():
                nonlocal total
                message = await receive()
                if message['type'] == 'http.request':
                    chunk = message.get('body', b'') or b''
                    if chunk:
                        total += len(chunk)
                        if total > max_bytes:
                            raise BodyLimitExceeded()
                return message

            async def tracked_send(message):
                nonlocal response_started
                if message['type'] == 'http.response.start':
                    response_started = True
                await send(message)
            try:
                await self.app(scope, counted_receive, tracked_send)
            except BodyLimitExceeded:
                if not response_started:
                    await self._send_json(send, 413, {'detail': 'Request body too large.'})
            return
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            if message['type'] != 'http.request':
                continue
            chunk = message.get('body', b'') or b''
            if chunk:
                body.extend(chunk)
                if len(body) > max_bytes:
                    await self._send_json(send, 413, {'detail': 'Request body too large.'})
                    while message.get('more_body', False):
                        message = await receive()
                        if message['type'] == 'http.disconnect':
                            break
                    return
            if not message.get('more_body', False):
                break
        captured = bytes(body)
        sent = False

        async def replay_receive():
            nonlocal sent
            if not sent:
                sent = True
                return {'type': 'http.request', 'body': captured, 'more_body': False}
            return {'type': 'http.disconnect'}
        await self.app(scope, replay_receive, send)

    @staticmethod
    async def _send_json(send, status_code: int, payload: dict) -> None:
        import json as _json
        raw = _json.dumps(payload).encode('utf-8')
        await send({'type': 'http.response.start', 'status': status_code, 'headers': [(b'content-type', b'application/json'), (b'content-length', str(len(raw)).encode('latin-1'))]})
        await send({'type': 'http.response.body', 'body': raw, 'more_body': False})

class SecurityHeadersMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        if request.url.path in ('/docs', '/redoc', '/openapi.json'):
            response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com;"
        else:
            response.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
        if request.url.scheme == 'https' or settings.app_env.lower() == 'production':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        if request.url.path.startswith('/api/'):
            is_unauthenticated_public = request.url.path.startswith('/api/portfolio/public/') and (not request.headers.get('authorization'))
            if not is_unauthenticated_public:
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
        return response
cors_origins = [origin.strip().rstrip('/') for origin in settings.cors_origins.split(',') if origin.strip() and origin.strip() != '*']
cors_origin_regex = settings.cors_origin_regex.strip() if settings.cors_origin_regex and settings.cors_origin_regex.strip() else None
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_origin_regex=cors_origin_regex, allow_credentials=True, allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allow_headers=['*'])

def _is_origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    clean = origin.strip().rstrip('/')
    if clean in cors_origins:
        return True
    if cors_origin_regex:
        try:
            if re.fullmatch(cors_origin_regex, clean):
                return True
        except re.error:
            logger.warning('Invalid regex in cors_origin_regex: %s', cors_origin_regex)
    return False

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    headers = dict(exc.headers or {})
    origin = request.headers.get('origin')
    if _is_origin_allowed(origin):
        headers['Access-Control-Allow-Origin'] = origin
        headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Vary'] = 'Origin'
    content = exc.detail if isinstance(exc.detail, dict) else {'detail': exc.detail}
    return JSONResponse(status_code=exc.status_code, content=content, headers=headers)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error('Unhandled error on %s %s: %s', request.method, request.url.path, exc, exc_info=True)
    headers: dict[str, str] = {}
    origin = request.headers.get('origin')
    if _is_origin_allowed(origin):
        headers['Access-Control-Allow-Origin'] = origin
        headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Vary'] = 'Origin'
    return JSONResponse(status_code=500, content={'detail': 'Internal server error'}, headers=headers)
app.include_router(auth_router, prefix='/api')
app.include_router(portfolio_images_router, prefix='/api')
app.include_router(portfolio_core_router, prefix='/api')
app.include_router(portfolio_review_router, prefix='/api')

@app.get('/api/ai-review/status', response_model=AiReviewStatusResponse, tags=['portfolio'])
def get_ai_review_status_endpoint_alias(user: User=Depends(get_current_profile), db: Session=Depends(get_db)) -> AiReviewStatusResponse:
    return get_ai_review_status(db, user.id)

@app.get('/')
def root() -> dict[str, str]:
    return {'app': settings.app_name, 'status': 'running'}

@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}
