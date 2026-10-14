from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRead(BaseModel):
    id: int
    clerk_id: str
    username: Optional[str] = None
    email: EmailStr
    avatar_url: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class PortfolioBase(BaseModel):
    title: str = "My Portfolio"
    summary: Optional[str] = None
    sections: dict[str, Any] = {}
    projects: list[dict[str, Any]] = []
    views: int = 0
    completion: int = 0


class PortfolioCreate(PortfolioBase):
    pass


class PortfolioRead(PortfolioBase):
    id: int
    user_id: int
    updated_at: datetime
    slug: Optional[str] = None
    review: Optional[dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class AiReviewResponse(BaseModel):
    summary: str
    score: int
    suggestions: list[str]


class PortfolioImageUploadResponse(BaseModel):
    url: str
    path: str
    bucket: str


class PortfolioImageDeleteResponse(BaseModel):
    deleted: bool
    path: str