import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.config import settings
from app.deps import get_db
from app.models import Portfolio, User
from app.schemas import PortfolioImageDeleteResponse, PortfolioImageUploadResponse
from app.routers.portfolio_auth import get_current_profile
from app.routers.portfolio_core import _new_slug

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = settings.max_image_size_mb * 1024 * 1024


def _validate_image_magic_bytes(content: bytes) -> str:
    """Validate file content against image magic bytes and return canonical mime type."""
    if len(content) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too small to be a valid image.",
        )
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image/webp"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid image format. Only authentic JPEG, PNG, or WebP files are allowed.",
    )


def _supabase_public_url(object_path: str) -> str:
    base_url = settings.supabase_url.rstrip("/")
    bucket = settings.supabase_bucket.strip("/")
    return f"{base_url}/storage/v1/object/public/{bucket}/{object_path.lstrip('/')}"


def _normalize_object_path(value: str) -> str | None:
    if not value:
        return None
    if "storage/v1/object/public/" in value:
        value = value.split("storage/v1/object/public/", 1)[1]
    if value.startswith(f"{settings.supabase_bucket}/"):
        value = value[len(settings.supabase_bucket) + 1 :]
    value = value.lstrip("/")
    return value or None


def _get_service_headers() -> dict[str, str]:
    service_key = settings.supabase_service_role_key or settings.supabase_key
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_SERVICE_ROLE_KEY is not configured on the backend.",
        )
    return {"Authorization": f"Bearer {service_key}", "apikey": service_key}


@router.post("/images/upload", response_model=PortfolioImageUploadResponse)
async def upload_portfolio_image(
    file: UploadFile = File(...),
    portfolio_id: Optional[int] = Query(None, description="Optional ID of portfolio to attach image to"),
    template_id: Optional[str] = Query(None, description="Optional template ID of portfolio"),
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> PortfolioImageUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file is required.")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG, PNG, and WebP images are allowed.")
    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Image is too large. Maximum size is {settings.max_image_size_mb} MB.")
    canonical_mime = _validate_image_magic_bytes(content)

    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(canonical_mime, ".jpg")
    object_path = f"{user.id}/{uuid4().hex}{ext}"
    storage_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                storage_url,
                headers={
                    **_get_service_headers(),
                    "Content-Type": canonical_mime,
                    "x-upsert": "true",
                },
                content=content,
            )
            if response.status_code >= 400:
                logger.error("Supabase upload returned error %s: %s", response.status_code, response.text)
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image storage service failed to save the upload.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Image upload failed with exception: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload image. Please try again.") from exc

    public_url = _supabase_public_url(object_path)

    target_portfolio: Optional[Portfolio] = None
    if portfolio_id is not None:
        target_portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()

    if target_portfolio is not None:
        sections = dict(target_portfolio.sections or {})
        profile = dict(sections.get("profile") or {})
        profile["profilePicture"] = public_url
        sections["profile"] = profile
        target_portfolio.sections = sections
        flag_modified(target_portfolio, "sections")
        if not target_portfolio.slug:
            target_portfolio.slug = _new_slug(db)
        target_portfolio.updated_at = datetime.now(timezone.utc)
        db.commit()

    return PortfolioImageUploadResponse(url=public_url, path=object_path, bucket=settings.supabase_bucket)


@router.delete("/images/{image_path:path}", response_model=PortfolioImageDeleteResponse)
async def delete_portfolio_image(
    image_path: str,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> PortfolioImageDeleteResponse:
    object_path = _normalize_object_path(image_path)
    if not object_path or ".." in object_path or object_path.startswith("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image path.")

    user_prefix = f"{user.id}/"
    if not object_path.startswith(user_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own portfolio images.",
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(
                f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}",
                headers={**_get_service_headers()},
            )
            if response.status_code >= 400 and response.status_code != 404:
                logger.error("Supabase delete returned error %s: %s", response.status_code, response.text)
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image storage service could not complete image deletion.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Image delete failed with exception: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete image. Please try again.") from exc

    user_portfolios = db.query(Portfolio).filter(Portfolio.user_id == user.id).all()
    for portfolio in user_portfolios:
        if isinstance(portfolio.sections, dict):
            profile = portfolio.sections.get("profile", {})
            if isinstance(profile, dict) and _normalize_object_path(profile.get("profilePicture") or "") == object_path:
                sections = dict(portfolio.sections)
                prof = dict(profile)
                prof["profilePicture"] = ""
                sections["profile"] = prof
                portfolio.sections = sections
                flag_modified(portfolio, "sections")
                portfolio.updated_at = datetime.now(timezone.utc)
    db.commit()

    return PortfolioImageDeleteResponse(deleted=True, path=object_path)
