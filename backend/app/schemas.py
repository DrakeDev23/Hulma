from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRead(BaseModel):
    id: int
    clerk_id: str
    username: Optional[str] = None
    email: EmailStr
    avatar_url: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)
