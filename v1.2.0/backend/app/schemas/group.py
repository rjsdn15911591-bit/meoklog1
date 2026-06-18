from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class GroupCreate(BaseModel):
    group_name: str


class GroupJoin(BaseModel):
    group_code: str


class GroupMemberResponse(BaseModel):
    user_id: uuid.UUID
    name: str
    avatar_url: Optional[str] = None
    joined_at: datetime
    today_calories: int = 0
    target_calories: Optional[int] = None


class GroupResponse(BaseModel):
    id: uuid.UUID
    group_name: str
    group_code: str
    owner_id: uuid.UUID
    member_count: int = 0
    is_owner: bool = False
    created_at: datetime
    members: List[GroupMemberResponse] = []


class CalorieRankingEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    name: str
    avatar_url: Optional[str] = None
    today_calories: int
    target_calories: Optional[int]
    achievement_rate: float
    total_carbs: float
    total_protein: float
    total_fat: float


class CalorieCompareResponse(BaseModel):
    log_date: str
    group_average_calories: float
    rankings: List[CalorieRankingEntry]
