from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Integer, func
from sqlalchemy.types import Uuid
import uuid
from app.database import Base


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    food_name = Column(String(100), nullable=False)
    food_name_en = Column(String(100), nullable=True)

    calories = Column(Numeric(6, 1), nullable=False)
    carbs = Column(Numeric(6, 1), nullable=False)
    protein = Column(Numeric(6, 1), nullable=False)
    fat = Column(Numeric(6, 1), nullable=False)

    serving_size = Column(Numeric(6, 1), nullable=False, default=100.0)
    category = Column(String(50), nullable=True)
    is_korean = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # 음식 검색 DB 확장 컬럼
    brand_name = Column(String(100), nullable=True)
    serving_unit = Column(String(10), nullable=False, default='g')   # 'g' or 'ml'
    source = Column(String(20), nullable=False, default='system')    # 'system' or 'user'
    created_by = Column(Uuid(as_uuid=True), nullable=True)           # user FK (느슨하게, FK constraint 없이)
    is_public = Column(Boolean, nullable=False, default=True)
    use_count = Column(Integer, nullable=False, default=0)
