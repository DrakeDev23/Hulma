from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    portfolios: Mapped[list["Portfolio"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="My Portfolio")
    summary: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    sections: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    projects: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    views: Mapped[int] = mapped_column(default=0, nullable=False)
    completion: Mapped[int] = mapped_column(default=0, nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="portfolios")
