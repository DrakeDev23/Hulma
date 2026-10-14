import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Portfolio, User
from app.schemas import PortfolioCreate, PortfolioRead
from app.routers.portfolio_auth import get_current_profile

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

DEFAULT_TEMPLATE = "simple"


def _template_of(sections) -> str:
    meta = sections.get("meta") if isinstance(sections, dict) else None
    return (meta or {}).get("templateId") or DEFAULT_TEMPLATE


def _new_slug(db: Session) -> str:
    while True:
        slug = secrets.token_urlsafe(8)
        if not db.query(Portfolio.id).filter(Portfolio.slug == slug).first():
            return slug


@router.get("/me", response_model=list[PortfolioRead])
def read_portfolio(
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> list[Portfolio]:
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.updated_at.desc())
        .all()
    )
    missing_slug = [p for p in portfolios if not p.slug]
    for portfolio in missing_slug:
        portfolio.slug = _new_slug(db)
    if missing_slug:
        db.commit()
    return portfolios


@router.post("/me", response_model=PortfolioRead)
def save_portfolio(
    payload: PortfolioCreate,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Portfolio:
    sections = dict(payload.sections or {})
    template_id = _template_of(sections)
    sections["meta"] = {**(sections.get("meta") or {}), "templateId": template_id}

    portfolio = Portfolio(user_id=user.id, views=0, slug=_new_slug(db))
    db.add(portfolio)

    portfolio.title = payload.title
    portfolio.summary = payload.summary
    portfolio.sections = sections
    portfolio.projects = payload.projects or []
    portfolio.completion = payload.completion
    if not portfolio.slug:
        portfolio.slug = _new_slug(db)
    portfolio.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("/public/{slug}")
def read_public_portfolio(slug: str, db: Session = Depends(get_db)) -> dict:
    portfolio = db.query(Portfolio).filter(Portfolio.slug == slug).first()
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")

    db.query(Portfolio).filter(Portfolio.id == portfolio.id).update(
        {Portfolio.views: Portfolio.views + 1, Portfolio.updated_at: Portfolio.updated_at},
        synchronize_session=False,
    )
    db.commit()

    return {
        "slug": portfolio.slug,
        "title": portfolio.title,
        "summary": portfolio.summary,
        "sections": portfolio.sections,
        "projects": portfolio.projects,
        "views": (portfolio.views or 0) + 1,
    }


@router.delete("/{portfolio_id}", response_model=dict)
def delete_portfolio(
    portfolio_id: int,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> dict:
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
    db.delete(portfolio)
    db.commit()
    return {"deleted": True, "id": portfolio_id}