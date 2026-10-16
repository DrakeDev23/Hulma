from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    portfolios: Mapped[list["Portfolio"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Portfolio(Base):
    __tablename__ = "portfolios"
    __table_args__ = (
        Index("idx_portfolios_user_updated", "user_id", "updated_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="My Portfolio")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sections: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    projects: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    views: Mapped[int] = mapped_column(default=0, nullable=False)
    completion: Mapped[int] = mapped_column(default=0, nullable=False)
    slug: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    review: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="portfolios")


class AiReviewUsage(Base):
    __tablename__ = "ai_review_usage"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    window_start: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    count: Mapped[int] = mapped_column(default=0, nullable=False)
    blocked_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    penalty_until: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    daily_count: Mapped[int] = mapped_column(default=0, nullable=False)
    daily_window_start: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship()