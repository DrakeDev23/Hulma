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
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception as exc:
        logger.error("Database connection check failed: %s", exc)
        raise
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

from starlette.middleware.base import BaseHTTPMiddleware
from app.rate_limiter import RateLimitMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.url.path in ("/docs", "/redoc", "/openapi.json"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com;"
            )
        else:
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if request.url.scheme == "https" or settings.app_env.lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # User-specific / API caching controls (CRITICAL FOR USER DATA ISOLATION)
        # Prevent any caching on user endpoints or authenticated responses
        if request.url.path.startswith("/api/"):
            is_unauthenticated_public = (
                request.url.path.startswith("/api/portfolio/public/")
                and not request.headers.get("authorization")
            )
            if not is_unauthenticated_public:
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"

        return response


cors_origins = [
    origin.strip().rstrip("/")
    for origin in settings.cors_origins.split(",")
    if origin.strip() and origin.strip() != "*"
]
cors_origin_regex = settings.cors_origin_regex.strip() if settings.cors_origin_regex and settings.cors_origin_regex.strip() else None

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def _is_origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    clean = origin.strip().rstrip("/")
    if clean in cors_origins:
        return True
    if cors_origin_regex:
        try:
            if re.fullmatch(cors_origin_regex, clean):
                return True
        except re.error:
            logger.warning("Invalid regex in cors_origin_regex: %s", cors_origin_regex)
    return False


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    headers = dict(exc.headers or {})
    origin = request.headers.get("origin")
    if _is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"

    content = exc.detail if isinstance(exc.detail, dict) else {"detail": exc.detail}
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    headers: dict[str, str] = {}
    origin = request.headers.get("origin")
    if _is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


app.include_router(auth_router, prefix="/api")
app.include_router(portfolio_images_router, prefix="/api")
app.include_router(portfolio_core_router, prefix="/api")
app.include_router(portfolio_review_router, prefix="/api")


@app.get("/api/ai-review/status", response_model=AiReviewStatusResponse, tags=["portfolio"])
def get_ai_review_status_endpoint_alias(
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> AiReviewStatusResponse:
    """Check remaining reviews, countdown, and spam penalty status."""
    return get_ai_review_status(db, user.id)


@app.get("/")
def root() -> dict[str, str]:
    return {"app": settings.app_name, "status": "running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
