import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.deps import get_db
from app.models import Portfolio, User
from app.schemas import PortfolioCreate, PortfolioRead, PortfolioUpdate
from app.routers.portfolio_auth import get_current_profile

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

DEFAULT_TEMPLATE = "simple"


def _template_of(sections) -> str:
    if not isinstance(sections, dict):
        return DEFAULT_TEMPLATE
    meta = sections.get("meta")
    if isinstance(meta, dict) and meta.get("templateId"):
        return str(meta["templateId"]).strip()
    return DEFAULT_TEMPLATE


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


@router.get("/{portfolio_id}", response_model=PortfolioRead)
def get_portfolio_by_id(
    portfolio_id: int,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Portfolio:
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id)
        .first()
    )
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )
    return portfolio


@router.post("/me", response_model=PortfolioRead)
def save_portfolio(
    payload: PortfolioCreate,
    portfolio_id: Optional[int] = Query(None, description="Optional ID of portfolio to update"),
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Portfolio:
    sections = dict(payload.sections or {})
    template_id = _template_of(sections)
    sections["meta"] = {**(sections.get("meta") or {}), "templateId": template_id}

    target_id = portfolio_id or payload.id
    portfolio: Optional[Portfolio] = None

    if target_id is not None:
        portfolio = (
            db.query(Portfolio)
            .filter(Portfolio.id == target_id, Portfolio.user_id == user.id)
            .first()
        )

    if portfolio is None:
        user_portfolios = (
            db.query(Portfolio)
            .filter(Portfolio.user_id == user.id)
            .order_by(Portfolio.updated_at.desc())
            .all()
        )
        for p in user_portfolios:
            if _template_of(p.sections) == template_id:
                portfolio = p
                break

    if portfolio is not None:
        portfolio.title = payload.title
        portfolio.summary = payload.summary
        portfolio.sections = sections
        portfolio.projects = payload.projects or []
        portfolio.completion = payload.completion or 0
        if not portfolio.slug:
            portfolio.slug = _new_slug(db)
        portfolio.updated_at = datetime.now(timezone.utc)
        flag_modified(portfolio, "sections")
        flag_modified(portfolio, "projects")
    else:
        portfolio = Portfolio(
            user_id=user.id,
            title=payload.title,
            summary=payload.summary,
            sections=sections,
            projects=payload.projects or [],
            views=0,
            completion=payload.completion or 0,
            slug=_new_slug(db),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(portfolio)

    for attempt in range(3):
        try:
            db.commit()
            db.refresh(portfolio)
            break
        except IntegrityError as exc:
            db.rollback()
            if attempt < 2:
                portfolio.slug = _new_slug(db)
                db.add(portfolio)
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A conflict occurred while saving portfolio. Please try again.",
                ) from exc

    return portfolio


@router.put("/{portfolio_id}", response_model=PortfolioRead)
def update_portfolio(
    portfolio_id: int,
    payload: PortfolioUpdate,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> Portfolio:
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id)
        .first()
    )
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )

    if payload.title is not None:
        portfolio.title = payload.title
    if payload.summary is not None:
        portfolio.summary = payload.summary
    if payload.sections is not None:
        sections = dict(payload.sections)
        template_id = _template_of(sections)
        sections["meta"] = {**(sections.get("meta") or {}), "templateId": template_id}
        portfolio.sections = sections
        flag_modified(portfolio, "sections")
    if payload.projects is not None:
        portfolio.projects = payload.projects
        flag_modified(portfolio, "projects")
    if payload.completion is not None:
        portfolio.completion = payload.completion
    if payload.views is not None:
        portfolio.views = payload.views

    portfolio.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
        db.refresh(portfolio)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict while updating portfolio.",
        )
    return portfolio


@router.get("/public/{slug}")
def read_public_portfolio(slug: str, db: Session = Depends(get_db)) -> dict:
    clean_slug = slug.strip()
    portfolio = db.query(Portfolio).filter(Portfolio.slug == clean_slug).first()
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )

    owner = portfolio.user
    if owner and isinstance(owner.settings, dict) and owner.settings.get("publicLink") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This portfolio is private. The owner has disabled public link sharing in settings.",
        )

    db.query(Portfolio).filter(Portfolio.id == portfolio.id).update(
        {Portfolio.views: Portfolio.views + 1},
        synchronize_session=False,
    )
    db.commit()
    db.refresh(portfolio)

    return {
        "id": portfolio.id,
        "slug": portfolio.slug,
        "title": portfolio.title,
        "summary": portfolio.summary,
        "sections": portfolio.sections or {},
        "projects": portfolio.projects or [],
        "views": portfolio.views or 0,
        "completion": portfolio.completion or 0,
        "updated_at": portfolio.updated_at.isoformat() if portfolio.updated_at else None,
        "created_at": portfolio.created_at.isoformat() if getattr(portfolio, "created_at", None) else None,
    }


@router.delete("/{portfolio_id}", response_model=dict)
def delete_portfolio(
    portfolio_id: int,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
) -> dict:
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id)
        .first()
    )
    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )
    db.delete(portfolio)
    db.commit()
    return {"deleted": True, "id": portfolio_id}