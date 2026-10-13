import json
import os
import re
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_db
from app.models import Portfolio, User
from app.schemas import (
    AiReviewResponse,
    PortfolioCreate,
    PortfolioImageDeleteResponse,
    PortfolioImageUploadResponse,
    PortfolioRead,
)
from app.security import get_current_user

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = settings.max_image_size_mb * 1024 * 1024

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def get_current_profile(
    clerk_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    clerk_id = clerk_claims.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth claims")

    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if user is None:
        email = clerk_claims.get("email") or f"{clerk_id}@clerk.local"
        username = clerk_claims.get("username") or email.split("@", 1)[0]
        user = User(
            clerk_id=clerk_id,
            email=email,
            username=username,
            avatar_url=clerk_claims.get("picture"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


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

    return {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
    }


@router.post("/images/upload", response_model=PortfolioImageUploadResponse)
async def upload_portfolio_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> PortfolioImageUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file is required.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed.",
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image is too large. Maximum size is {settings.max_image_size_mb} MB.",
        )

    original_name = str(file.filename or "portfolio-image").replace('\\', '/')
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(original_name)) or "portfolio-image"
    object_path = f"{user.id}/{uuid4().hex}_{safe_name}"
    storage_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                storage_url,
                headers={
                    **_get_service_headers(),
                    "Content-Type": file.content_type or "application/octet-stream",
                    "x-upsert": "true",
                },
                content=content,
            )
            if response.status_code >= 400:
                detail = response.text
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Supabase upload failed: {detail}",
                )
    except HTTPException:
        raise
    except Exception as exc:  
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {exc}",
        ) from exc

    public_url = _supabase_public_url(object_path)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).order_by(Portfolio.updated_at.desc()).first()

    if portfolio is None:
        portfolio = Portfolio(
            user_id=user.id,
            title=f"{user.username or user.email.split('@', 1)[0]}'s Portfolio",
            summary="",
            sections={"profile": {"profilePicture": public_url}},
            projects=[],
            views=0,
            completion=0,
        )
        db.add(portfolio)
    else:
        profile = portfolio.sections.get("profile", {}) if isinstance(portfolio.sections, dict) else {}
        profile["profilePicture"] = public_url
        portfolio.sections["profile"] = profile
        portfolio.updated_at = datetime.now(timezone.utc)

    db.commit()
    return PortfolioImageUploadResponse(url=public_url, path=object_path, bucket=settings.supabase_bucket)


@router.delete("/images/{image_path:path}", response_model=PortfolioImageDeleteResponse)
async def delete_portfolio_image(
    image_path: str,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> PortfolioImageDeleteResponse:
    object_path = _normalize_object_path(image_path)
    if not object_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image path.")

    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).order_by(Portfolio.updated_at.desc()).first()
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No portfolio found for this user.")

    profile = portfolio.sections.get("profile", {}) if isinstance(portfolio.sections, dict) else {}
    stored_url = profile.get("profilePicture")
    stored_path = _normalize_object_path(stored_url or "")

    owns_image = object_path == stored_path
    if not owns_image:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own portfolio image.",
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(
                f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}",
                headers={**_get_service_headers()},
            )
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Supabase delete failed: {response.text}",
                )
    except HTTPException:
        raise
    except Exception as exc:  
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {exc}",
        ) from exc

    if stored_path == object_path:
        profile["profilePicture"] = ""
        portfolio.sections["profile"] = profile
        portfolio.updated_at = datetime.now(timezone.utc)
        db.commit()

    return PortfolioImageDeleteResponse(deleted=True, path=object_path)


@router.get("/me", response_model=PortfolioRead | None)
def read_portfolio(
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Portfolio | None:
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).order_by(Portfolio.updated_at.desc()).first()
    return portfolio


@router.post("/me", response_model=PortfolioRead)
def save_portfolio(
    payload: PortfolioCreate,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Portfolio:
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()

    if portfolio is None:
        portfolio = Portfolio(
            user_id=user.id,
            title=payload.title,
            summary=payload.summary,
            sections=payload.sections or {},
            projects=payload.projects or [],
            views=payload.views,
            completion=payload.completion,
        )
        db.add(portfolio)
    else:
        portfolio.title = payload.title
        portfolio.summary = payload.summary
        portfolio.sections = payload.sections or {}
        portfolio.projects = payload.projects or []
        portfolio.views = payload.views
        portfolio.completion = payload.completion
        portfolio.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.post("/review", response_model=AiReviewResponse)
async def review_portfolio(
    payload: PortfolioCreate,
    user: User = Depends(get_current_profile),
) -> AiReviewResponse:
    base_summary = payload.summary or "Portfolio is ready for publishing."
    base_score = min(100, max(0, int(payload.completion or 0)))
    suggestions = [
        "Tighten the opening headline to highlight your strongest result.",
        "Add one measurable outcome for each project section.",
        "Keep the portfolio concise and easy to scan.",
    ]

    provider_key = settings.groq_api_key or settings.openai_api_key
    if not provider_key:
        return AiReviewResponse(
            summary=base_summary,
            score=base_score,
            suggestions=suggestions,
        )

    prompt = (
        "Review this portfolio for clarity, impact, and recruiter-readability. "
        f"Title: {payload.title}. Summary: {base_summary}. "
        f"Sections: {payload.sections}. Projects: {payload.projects}."
    )

    provider_url = "https://api.groq.com/openai/v1/chat/completions" if settings.groq_api_key else "https://api.openai.com/v1/chat/completions"
    model_name = settings.ai_model

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                provider_url,
                headers={
                    "Authorization": f"Bearer {provider_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": "You are a helpful portfolio reviewer. Return compact JSON with summary, score, and suggestions."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            payload_data = response.json()
            content = payload_data["choices"][0]["message"]["content"]
            parsed = json.loads(content) if isinstance(content, str) else content
    except Exception:
        return AiReviewResponse(
            summary=base_summary,
            score=base_score,
            suggestions=suggestions,
        )

    if isinstance(parsed, dict):
        return AiReviewResponse(
            summary=str(parsed.get("summary") or base_summary),
            score=min(100, max(0, int(parsed.get("score") or base_score))),
            suggestions=[str(item) for item in (parsed.get("suggestions") or suggestions)][:3],
        )

    return AiReviewResponse(
        summary=base_summary,
        score=base_score,
        suggestions=suggestions,
    )
