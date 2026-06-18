from sqlalchemy import Column, String, SmallInteger, Numeric, DateTime, Date, Boolean, ForeignKey, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class MealGroupShare(Base):
    __tablename__ = "meal_group_shares"

    meal_id = Column(Uuid(as_uuid=True), ForeignKey("meal_records.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(Uuid(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    shared_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MealRecord(Base):
    __tablename__ = "meal_records"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Uuid(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)

    image_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)

    meal_type = Column(String(10), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    log_date = Column(Date, nullable=False)

    total_calories = Column(SmallInteger, nullable=False, default=0)
    total_carbs = Column(Numeric(6, 1), nullable=False, default=0)
    total_protein = Column(Numeric(6, 1), nullable=False, default=0)
    total_fat = Column(Numeric(6, 1), nullable=False, default=0)

    caption = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    detected_foods = relationship("DetectedFood", back_populates="meal_record", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="meal_record", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="meal_record", cascade="all, delete-orphan")


class DetectedFood(Base):
    __tablename__ = "detected_foods"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_id = Column(Uuid(as_uuid=True), ForeignKey("meal_records.id", ondelete="CASCADE"), nullable=False)
    food_item_id = Column(Uuid(as_uuid=True), ForeignKey("food_items.id"), nullable=True)

    food_name = Column(String(100), nullable=False)
    serving_size = Column(Numeric(6, 1), nullable=False)
    calories = Column(SmallInteger, nullable=False)
    carbs = Column(Numeric(6, 1), nullable=False)
    protein = Column(Numeric(6, 1), nullable=False)
    fat = Column(Numeric(6, 1), nullable=False)

    confidence = Column(Numeric(4, 3), nullable=True)
    is_edited = Column(Boolean, nullable=False, default=False)
    sort_order = Column(SmallInteger, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    meal_record = relationship("MealRecord", back_populates="detected_foods")
