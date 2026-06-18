from sqlalchemy import Column, String, SmallInteger, Numeric, DateTime, func
from sqlalchemy.types import Uuid
import uuid
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    avatar_url = Column(String, nullable=True)

    age = Column(SmallInteger, nullable=True)
    gender = Column(String(10), nullable=True)
    height = Column(Numeric(5, 1), nullable=True)
    weight = Column(Numeric(5, 1), nullable=True)
    activity_level = Column(String(20), nullable=True)

    goal_type = Column(String(10), nullable=True)
    target_calories = Column(SmallInteger, nullable=True)
    target_carbs = Column(SmallInteger, nullable=True)
    target_protein = Column(SmallInteger, nullable=True)
    target_fat = Column(SmallInteger, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
