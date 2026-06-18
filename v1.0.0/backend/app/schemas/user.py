from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class UserBase(BaseModel):
    name: str
    email: str
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None
    target_calories: Optional[int] = None
    target_carbs: Optional[int] = None
    target_protein: Optional[int] = None
    target_fat: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DailySummaryResponse(BaseModel):
    log_date: str
    total_calories: int
    total_carbs: float
    total_protein: float
    total_fat: float
    target_calories: int
    achievement_rate: float
    meal_count: int
    breakdown: dict
