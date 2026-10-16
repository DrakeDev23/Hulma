import re
import secrets
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.deps import get_db
from app.models import User
from app.security import get_current_user


def get_or_create_user(db: Session, clerk_claims: dict) -> User:
    clerk_id = clerk_claims.get("sub")
    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth claims: missing user ID",
        )

    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if user is not None:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )
        updated = False
        new_avatar = clerk_claims.get("picture") or clerk_claims.get("avatar_url")
        if new_avatar and user.avatar_url != new_avatar:
            user.avatar_url = new_avatar
            updated = True

        new_email = (
            clerk_claims.get("email")
            or clerk_claims.get("email_address")
            or clerk_claims.get("primary_email_address")
        )
        if new_email and "@" in new_email and not new_email.endswith("@clerk.local"):
            clean_email = new_email.strip().lower()
            if user.email.endswith("@clerk.local") or user.email != clean_email:
                other = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
                if not other:
                    user.email = clean_email
                    updated = True

        new_username = clerk_claims.get("username") or clerk_claims.get("preferred_username")
        if new_username and not new_username.startswith("user_"):
            clean_username = new_username.strip()
            if user.username.startswith("user_") or not user.username:
                other = db.query(User).filter(User.username == clean_username, User.id != user.id).first()
                if not other:
                    user.username = clean_username
                    updated = True

        if updated:
            try:
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
        return user

    provided_email = (
        clerk_claims.get("email")
        or clerk_claims.get("email_address")
        or clerk_claims.get("primary_email_address")
    )
    email = provided_email if (provided_email and "@" in str(provided_email) and not str(provided_email).endswith("@clerk.local")) else f"{clerk_id}@clerk.local"

    # If the email is already in use by a different account, do NOT hijack that account.
    existing_by_email = db.query(User).filter(User.email == email).first()
    if existing_by_email and existing_by_email.clerk_id != clerk_id:
        email = f"{clerk_id}@clerk.local"

    provided_username = clerk_claims.get("username") or clerk_claims.get("preferred_username")
    if provided_username and not provided_username.startswith("user_"):
        raw_username = provided_username
    elif provided_email and not provided_email.endswith("@clerk.local") and "@" in provided_email:
        raw_username = provided_email.split("@")[0]
    else:
        raw_username = "user"

    base_username = re.sub(r"[^A-Za-z0-9_-]", "", raw_username)[:100] or "user"
    candidate_username = base_username

    counter = 1
    while db.query(User.id).filter(User.username == candidate_username).first():
        suffix = secrets.token_hex(2)
        candidate_username = f"{base_username[:90]}_{suffix}"
        counter += 1
        if counter > 20:
            candidate_username = f"user_{secrets.token_hex(4)}"
            break

    user = User(
        clerk_id=clerk_id,
        email=email,
        username=candidate_username,
        avatar_url=clerk_claims.get("picture") or clerk_claims.get("avatar_url"),
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        user = db.query(User).filter(User.clerk_id == clerk_id).first()
        if user is None:
            user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not provision user profile",
            )

    return user


def get_current_profile(
    clerk_claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return get_or_create_user(db, clerk_claims)
