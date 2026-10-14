import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_db
from app.models import Portfolio, User
from app.routers.portfolio_auth import get_current_profile
from app.schemas import AiReviewResponse, PortfolioCreate

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _safe_score(value, fallback: int) -> int:
    try:
        return min(100, max(0, int(float(value))))
    except (TypeError, ValueError):
        return fallback


@router.post("/review", response_model=AiReviewResponse)
async def review_portfolio(
    payload: PortfolioCreate,
    portfolio_id: int | None = None,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> AiReviewResponse:
    owned_portfolio = None
    if portfolio_id is not None:
        owned_portfolio = (
            db.query(Portfolio)
            .filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id)
            .first()
        )
        if owned_portfolio is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
    base_summary = payload.summary or "Portfolio is ready for publishing."
    base_score = min(100, max(0, int(payload.completion or 0)))
    suggestions = [
        "Tighten the opening headline to highlight your strongest result.",
        "Add one measurable outcome for each project section.",
        "Keep the portfolio concise and easy to scan.",
    ]
    provider_key = settings.groq_api_key or settings.openai_api_key
    if not provider_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="AI provider key not configured. Set GROQ_API_KEY or OPENAI_API_KEY.",
        )
    prompt = (
        "Review this portfolio for clarity, impact, and recruiter-readability. "
        f"Title: {payload.title}. Summary: {base_summary}. "
        f"Sections: {payload.sections}. Projects: {payload.projects}."
    )
    provider_url = (
        "https://api.groq.com/openai/v1/chat/completions"
        if settings.groq_api_key
        else "https://api.openai.com/v1/chat/completions"
    )
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
                        {
                            "role": "system",
                            "content": "You are a helpful portfolio reviewer. Return compact JSON with summary, score, and suggestions.",
                        },
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
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"AI review failed ({exc.response.status_code}) "
                f"model={model_name}: {exc.response.text[:300]}"
            ),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI review failed (model={model_name}): {exc}",
        ) from exc
    if isinstance(parsed, dict):
        result = AiReviewResponse(
            summary=str(parsed.get("summary") or base_summary),
            score=_safe_score(parsed.get("score"), base_score),
            suggestions=[str(item) for item in (parsed.get("suggestions") or suggestions)][:3],
        )
    else:
        result = AiReviewResponse(
            summary=base_summary,
            score=base_score,
            suggestions=suggestions,
        )
    if owned_portfolio is not None:
        owned_portfolio.review = {
            **result.model_dump(),
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        db.commit()
    return result