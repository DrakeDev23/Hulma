import secrets
import time
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.deps import get_db
from app.models import Portfolio, User
from app.schemas import PortfolioCreate, PortfolioRead, PortfolioUpdate
from app.routers.portfolio_auth import get_current_profile

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

DEFAULT_TEMPLATE = "simple"
MAX_PORTFOLIOS_PER_USER = 10

_recent_views: dict[str, float] = {}
_recent_views_lock = Lock()


def _should_increment_view(client_ip: str, portfolio_id: int) -> bool:
    key = f"{client_ip}:{portfolio_id}"
    now = time.time()
    with _recent_views_lock:
        if len(_recent_views) > 10000:
            cutoff = now - 300
            stale = [k for k, t in _recent_views.items() if t < cutoff]
            for k in stale:
                del _recent_views[k]
        last = _recent_views.get(key)
        if last is None or (now - last) > 60:
            _recent_views[key] = now
            return True
        return False


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
        existing = db.query(Portfolio).filter(Portfolio.id == target_id).first()
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found.",
            )
        if existing.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not own this portfolio.",
            )
        portfolio = existing

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
        if portfolio is None and len(user_portfolios) == 1:
            portfolio = user_portfolios[0]
        if portfolio is None and len(user_portfolios) >= MAX_PORTFOLIOS_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum portfolio limit reached ({MAX_PORTFOLIOS_PER_USER} portfolios). Please update or delete an existing portfolio.",
            )

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
    existing = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )
    if existing.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not own this portfolio.",
        )
    portfolio = existing

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
def read_public_portfolio(slug: str, request: Request, db: Session = Depends(get_db)) -> dict:
    clean_slug = slug.strip()
    portfolio = None

    if clean_slug:
        portfolio = db.query(Portfolio).filter(Portfolio.slug == clean_slug).first()

    if portfolio is None and clean_slug.isdigit():
        portfolio = db.query(Portfolio).filter(Portfolio.id == int(clean_slug)).first()

    if portfolio is None and clean_slug:
        user = db.query(User).filter(func.lower(User.username) == clean_slug.lower()).first()
        if user:
            portfolio = (
                db.query(Portfolio)
                .filter(Portfolio.user_id == user.id)
                .order_by(Portfolio.updated_at.desc())
                .first()
            )

    if portfolio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )

    if not portfolio.slug:
        portfolio.slug = _new_slug(db)
        try:
            db.commit()
            db.refresh(portfolio)
        except Exception:
            db.rollback()

    owner = portfolio.user
    auth_header = request.headers.get("authorization", "")
    is_owner = False
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        try:
            from app.security import verify_clerk_jwt
            claims = verify_clerk_jwt(token)
            if isinstance(claims, dict) and owner and claims.get("sub") == owner.clerk_id:
                is_owner = True
        except Exception:
            is_owner = False

    if owner and isinstance(owner.settings, dict) and owner.settings.get("publicLink") is False:
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This portfolio is private. The owner has disabled public link sharing in settings.",
            )

    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("cf-connecting-ip")
        or request.headers.get("x-real-ip")
        or (request.client.host if request.client else "unknown")
    )

    if not is_owner and _should_increment_view(client_ip, portfolio.id):
        try:
            db.query(Portfolio).filter(Portfolio.id == portfolio.id).update(
                {Portfolio.views: Portfolio.views + 1},
                synchronize_session=False,
            )
            db.commit()
            db.refresh(portfolio)
        except Exception:
            db.rollback()

    return {
        "id": portfolio.id,
        "slug": portfolio.slug,
        "username": owner.username if owner else None,
        "is_owner": is_owner,
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
    existing = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )
    if existing.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not own this portfolio.",
        )
    db.delete(existing)
    db.commit()
    return {"deleted": True, "id": portfolio_id}