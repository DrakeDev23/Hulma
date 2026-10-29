import json
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.constants import MAX_REVIEWS


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=1000)
    settings: Optional[dict[str, Any]] = None

    @field_validator("settings")
    @classmethod
    def validate_settings(cls, v):
        if v is not None:
            if not isinstance(v, dict):
                return {}
            if len(v) > 50:
                raise ValueError("Settings dictionary has too many keys (max 50).")
            try:
                if len(json.dumps(v)) > 20_000:
                    raise ValueError("Settings payload exceeds maximum allowed size (20KB).")
            except (TypeError, OverflowError):
                raise ValueError("Settings must be JSON serializable.")
            if "tone" in v:
                tone = v.get("tone")
                v["tone"] = tone if isinstance(tone, str) and tone in {"gentle", "direct", "balanced"} else "balanced"
            if "focus" in v:
                raw_focus = v.get("focus")
                if isinstance(raw_focus, list):
                    filtered = []
                    seen = set()
                    for f in raw_focus:
                        if isinstance(f, str) and f in {"template", "layout", "design", "content"} and f not in seen:
                            seen.add(f)
                            filtered.append(f)
                    v["focus"] = filtered if filtered else ["template", "layout", "design", "content"]
                else:
                    v["focus"] = ["template", "layout", "design", "content"]
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
    if s.startswith("//"):
        return False
    lower = s.lower()
    if lower.startswith(("javascript:", "data:", "vbscript:", "file:")):
        return False
    return lower.startswith(("http://", "https://", "mailto:", "tel:")) or s.startswith(("/", "#"))


URL_FIELD_SUBSTRINGS = (
    "url", "link", "demo", "repo", "github", "href", "src", "image", "thumbnail"
)


def _validate_urls_recursive(data: Any, path: str = "") -> None:
    if isinstance(data, dict):
        for k, val in data.items():
            key_str = str(k).lower()
            current_path = f"{path}.{k}" if path else str(k)
            if any(sub in key_str for sub in URL_FIELD_SUBSTRINGS):
                if isinstance(val, str) and not _is_safe_url(val):
                    raise ValueError(f"Unsafe URL scheme detected in field '{current_path}'. Only http/https URLs are allowed.")
            _validate_urls_recursive(val, current_path)
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            current_path = f"{path}[{idx}]"
            _validate_urls_recursive(item, current_path)


def _validate_project_urls(projects: list[dict[str, Any]]) -> None:
    _validate_urls_recursive(projects, "projects")


def _validate_section_urls(sections: dict[str, Any]) -> None:
    _validate_urls_recursive(sections, "sections")


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


Category = Literal["template", "layout", "design", "content"]
Priority = Literal["high", "medium", "low"]


class ReviewCategory(BaseModel):
    key: Category
    label: str = Field(..., max_length=50)
    score: int = Field(..., ge=0, le=100)
    note: str = Field(..., max_length=200)


class ReviewSuggestion(BaseModel):
    id: str = Field(..., max_length=20)
    category: Category
    priority: Priority
    title: str = Field(..., max_length=100)
    text: str = Field(..., max_length=600)


class AiReviewResponse(BaseModel):
    summary: str = Field(..., max_length=400)
    score: int
    categories: list[ReviewCategory] = []
    suggestions: list[ReviewSuggestion] = []
    remaining: Optional[int] = None
    remaining_uses: Optional[int] = None
    max_per_window: Optional[int] = MAX_REVIEWS
    locked_until: Optional[str] = None
    daily_remaining: Optional[int] = None
    retry_after_seconds: Optional[int] = None
    source: Literal["ai", "heuristic"] = "heuristic"


class AiReviewStatusResponse(BaseModel):
    remaining: int
    remaining_uses: Optional[int] = None
    locked_until: Optional[str] = None
    retry_after_seconds: int
    daily_remaining: int
    is_penalty_active: bool
    is_daily_limit: bool = False
    max_per_window: int = MAX_REVIEWS
    max_daily: int = 25


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
    remaining: Optional[int] = None
    remaining_uses: Optional[int] = None
    max_per_window: Optional[int] = MAX_REVIEWS
    locked_until: Optional[str] = None
    retry_after_seconds: Optional[int] = None


class PortfolioImageUploadResponse(BaseModel):
    url: str
    path: str
    bucket: str


class PortfolioImageDeleteResponse(BaseModel):
    deleted: bool
    path: str