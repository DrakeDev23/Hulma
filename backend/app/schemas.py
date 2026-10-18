import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=1000)
    settings: Optional[dict[str, Any]] = None

    @field_validator("settings")
    @classmethod
    def validate_settings(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Settings dictionary has too many keys (max 50).")
            try:
                if len(json.dumps(v)) > 20_000:
                    raise ValueError("Settings payload exceeds maximum allowed size (20KB).")
            except (TypeError, OverflowError):
                raise ValueError("Settings must be JSON serializable.")
        return v


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


def _is_safe_url(url: Any) -> bool:
    if not isinstance(url, str):
        return True
    s = url.strip()
    if not s:
        return True
    lower = s.lower()
    if lower.startswith(("javascript:", "data:", "vbscript:", "file:")):
        return False
    return lower.startswith(("http://", "https://", "mailto:", "tel:")) or s.startswith(("/", "#"))


def _validate_project_urls(projects: list[dict[str, Any]]) -> None:
    for p in projects:
        if isinstance(p, dict):
            for k, val in p.items():
                if any(sub in k.lower() for sub in ("url", "link", "demo", "repo", "github")):
                    if not _is_safe_url(val):
                        raise ValueError(f"Unsafe URL scheme detected in project field '{k}'. Only http/https URLs are allowed.")


def _validate_section_urls(sections: dict[str, Any]) -> None:
    social = sections.get("socialLinks")
    if isinstance(social, dict):
        for k, val in social.items():
            if not _is_safe_url(val):
                raise ValueError(f"Unsafe URL scheme detected in social link '{k}'. Only http/https URLs are allowed.")


class PortfolioBase(BaseModel):
    title: str = Field("My Portfolio", max_length=200)
    summary: Optional[str] = Field(None, max_length=2000)
    sections: Optional[dict[str, Any]] = None
    projects: Optional[list[dict[str, Any]]] = None
    views: Optional[int] = Field(0, ge=0, le=1_000_000_000)
    completion: Optional[int] = Field(0, ge=0, le=100)

    @field_validator("projects")
    @classmethod
    def validate_projects(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Maximum 50 projects allowed per portfolio.")
            try:
                if len(json.dumps(v)) > 100_000:
                    raise ValueError("Projects payload exceeds maximum allowed size (100KB).")
            except (TypeError, OverflowError):
                raise ValueError("Projects must be JSON serializable.")
            _validate_project_urls(v)
        return v

    @field_validator("sections")
    @classmethod
    def validate_sections(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Sections dictionary has too many keys (max 50).")
            try:
                if len(json.dumps(v)) > 150_000:
                    raise ValueError("Sections payload exceeds maximum allowed size (150KB).")
            except (TypeError, OverflowError):
                raise ValueError("Sections must be JSON serializable.")
            _validate_section_urls(v)
        return v


class PortfolioCreate(PortfolioBase):
    id: Optional[int] = None


class PortfolioUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    summary: Optional[str] = Field(None, max_length=2000)
    sections: Optional[dict[str, Any]] = None
    projects: Optional[list[dict[str, Any]]] = None
    completion: Optional[int] = Field(None, ge=0, le=100)
    views: Optional[int] = Field(None, ge=0, le=1_000_000_000)

    @field_validator("projects")
    @classmethod
    def validate_projects(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Maximum 50 projects allowed per portfolio.")
            try:
                if len(json.dumps(v)) > 100_000:
                    raise ValueError("Projects payload exceeds maximum allowed size (100KB).")
            except (TypeError, OverflowError):
                raise ValueError("Projects must be JSON serializable.")
            _validate_project_urls(v)
        return v

    @field_validator("sections")
    @classmethod
    def validate_sections(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Sections dictionary has too many keys (max 50).")
            try:
                if len(json.dumps(v)) > 150_000:
                    raise ValueError("Sections payload exceeds maximum allowed size (150KB).")
            except (TypeError, OverflowError):
                raise ValueError("Sections must be JSON serializable.")
            _validate_section_urls(v)
        return v


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
    remaining: Optional[int] = None
    daily_remaining: Optional[int] = None


class AiReviewStatusResponse(BaseModel):
    remaining: int
    retry_after_seconds: int
    daily_remaining: int
    is_penalty_active: bool
    max_per_window: int = 3
    max_daily: int = 10


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