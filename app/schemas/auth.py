from pydantic import BaseModel, EmailStr, Field

from app.models.business import BusinessType


class BootstrapRequest(BaseModel):
    business_name: str | None = Field(default=None, min_length=1, max_length=255)
    business_type: BusinessType | None = None


class AuthProfileResponse(BaseModel):
    user_id: int
    email: EmailStr
    role: str
    business_id: int
    business_name: str
    logo_url: str | None = None
