from pydantic import BaseModel
from typing import Optional


class FoodSearchResult(BaseModel):
    id: str
    food_name: str
    brand_name: Optional[str]
    serving_size: float
    serving_unit: str
    calories: float
    carbs: float
    protein: float
    fat: float
    source: str
    is_public: bool
    use_count: int


class FoodCreate(BaseModel):
    food_name: str
    brand_name: Optional[str] = None
    serving_size: float = 100.0
    serving_unit: str = 'g'
    calories: float
    carbs: float
    protein: float
    fat: float
    is_public: bool = False  # 기본값: 개인용
