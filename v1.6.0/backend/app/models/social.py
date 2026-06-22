from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, func, UniqueConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_id = Column(Uuid(as_uuid=True), ForeignKey("meal_records.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)
    count = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("meal_id", "user_id", "type", name="uq_reaction"),)

    meal_record = relationship("MealRecord", back_populates="reactions")
    user = relationship("User")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_id = Column(Uuid(as_uuid=True), ForeignKey("meal_records.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    meal_record = relationship("MealRecord", back_populates="comments")
    user = relationship("User")
