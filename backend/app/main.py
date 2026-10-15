import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.routers.auth import router as auth_router
from app.routers.portfolio_images import router as portfolio_images_router
from app.routers.portfolio_core import router as portfolio_core_router
from app.routers.portfolio_review import router as portfolio_review_router
from app.security import validate_auth_config

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

cors_origins = [origin.strip().rstrip("/") for origin in settings.cors_origins.split(",") if origin.strip()]
cors_origin_regex = settings.cors_origin_regex.strip() if settings.cors_origin_regex and settings.cors_origin_regex.strip() else None

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _is_origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    clean = origin.strip().rstrip("/")
    if "*" in cors_origins or clean in cors_origins:
        return True
    if cors_origin_regex:
        try:
            if re.match(cors_origin_regex, clean):
                return True
        except re.error:
            logger.warning("Invalid regex in cors_origin_regex: %s", cors_origin_regex)
    return False


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


@app.get("/")
def root() -> dict[str, str]:
    return {"app": settings.app_name, "status": "running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
