from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.deps import get_db
from app.models import User
from app.schemas import UserRead, UserUpdate
from app.security import get_current_user
from app.routers.portfolio_auth import get_or_create_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserRead)
def read_me(
    clerk_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return get_or_create_user(db, clerk_claims)


@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    clerk_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = get_or_create_user(db, clerk_claims)

    if payload.username is not None and payload.username.strip():
        clean_username = payload.username.strip()
        existing = db.query(User).filter(User.username == clean_username, User.id != user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken by another account.",
            )
        user.username = clean_username

    if payload.email is not None and payload.email.strip():
        clean_email = payload.email.strip().lower()
        if user.email.endswith("@clerk.local"):
            existing = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address is already in use by another account.",
                )
            user.email = clean_email
        elif user.email != clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Primary email cannot be changed directly. Update your email through your authentication provider.",
            )

    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url

    if payload.settings is not None:
        current_settings = dict(user.settings or {})
        current_settings.update(payload.settings)
        user.settings = current_settings
        flag_modified(user, "settings")

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already taken by another account.",
        )
    return user


@router.delete("/me", response_model=dict)
def delete_me(
    clerk_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user = get_or_create_user(db, clerk_claims)
    db.delete(user)
    db.commit()
    return {"deleted": True, "message": "Account and all associated portfolios deleted successfully."}
