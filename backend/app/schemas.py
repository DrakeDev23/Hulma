from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Optional[dict[str, Any]] = None


class UserRead(BaseModel):
    id: int
    clerk_id: str
    username: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    settings: Optional[dict[str, Any]] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PortfolioBase(BaseModel):
    title: str = "My Portfolio"
    summary: Optional[str] = None
    sections: Optional[dict[str, Any]] = None
    projects: Optional[list[dict[str, Any]]] = None
    views: Optional[int] = 0
    completion: Optional[int] = 0


class PortfolioCreate(PortfolioBase):
    id: Optional[int] = None


class PortfolioUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    sections: Optional[dict[str, Any]] = None
    projects: Optional[list[dict[str, Any]]] = None
    completion: Optional[int] = None
    views: Optional[int] = None


class PortfolioRead(BaseModel):
    id: int
    user_id: int
    title: str = "My Portfolio"
    summary: Optional[str] = None
    sections: dict[str, Any] = {}
    projects: list[dict[str, Any]] = []
    views: int = 0
    completion: int = 0
    slug: Optional[str] = None
    review: Optional[dict[str, Any]] = None
    updated_at: datetime
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReviewCategory(BaseModel):
    key: str
    label: str
    score: int
    note: str


class ReviewSuggestion(BaseModel):
    id: str
    category: str
    priority: str
    title: str
    text: str


class AiReviewResponse(BaseModel):
    summary: str
    score: int
    categories: list[ReviewCategory] = []
    suggestions: list[Any] = []


class DraftTip(BaseModel):
    field: str
    label: str
    tip: str


class AiDraftCheckResponse(BaseModel):
    score: int
    summary: str
    tips: list[DraftTip] = []
    missing_fields: list[str] = []
    ready_for_audit: bool = False


class PortfolioImageUploadResponse(BaseModel):
    url: str
    path: str
    bucket: str


class PortfolioImageDeleteResponse(BaseModel):
    deleted: bool
    path: str