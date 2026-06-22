from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.types import Uuid
from app.database import Base


class UserFavoriteFood(Base):
    __tablename__ = "user_favorite_foods"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    food_id = Column(Uuid(as_uuid=True), ForeignKey("food_items.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
