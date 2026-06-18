from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid


class DetectedFoodBase(BaseModel):
    food_name: str
    serving_size: float
    calories: int
    carbs: float
    protein: float
    fat: float
    confidence: Optional[float] = None
    is_edited: bool = False


class DetectedFoodResponse(DetectedFoodBase):
    id: uuid.UUID
    food_item_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


class DetectedFoodUpdate(BaseModel):
    id: Optional[uuid.UUID] = None
    food_name: str
    serving_size: float
    calories: int
    carbs: float
    protein: float
    fat: float


class MealFoodsUpdate(BaseModel):
    detected_foods: List[DetectedFoodUpdate]
    group_ids: Optional[List[str]] = None


class UserMinimal(BaseModel):
    id: uuid.UUID
    name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ReactionSummary(BaseModel):
    thumbsup: int = 0
    yummy: int = 0
    fire: int = 0
    muscle: int = 0
    sad: int = 0


class MealRecordResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    group_id: Optional[uuid.UUID] = None
    image_url: str
    thumbnail_url: str
    meal_type: str
    uploaded_at: datetime
    log_date: date
    total_calories: int
    total_carbs: float
    total_protein: float
    total_fat: float
    caption: Optional[str] = None
    detected_foods: List[DetectedFoodResponse] = []
    user: Optional[UserMinimal] = None

    class Config:
        from_attributes = True


class MealRecordFeedResponse(MealRecordResponse):
    reaction_summary: ReactionSummary = ReactionSummary()
    comment_count: int = 0
    my_reaction: Optional[str] = None


class AIAnalysisResult(BaseModel):
    detected_foods: List[DetectedFoodBase]
    total_calories: int
    total_carbs: float
    total_protein: float
    total_fat: float
    is_multi_food_detected: bool


class MealCreateResponse(BaseModel):
    meal_id: uuid.UUID
    image_url: str
    thumbnail_url: str
    meal_type: str
    uploaded_at: datetime
    log_date: date
    ai_result: AIAnalysisResult
