from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db
from app.models import User
from app.security import get_current_user


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
