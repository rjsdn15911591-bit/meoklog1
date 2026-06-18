from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_name = Column(String(50), nullable=False)
    group_code = Column(String(8), unique=True, nullable=False)
    owner_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    group_id = Column(Uuid(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    group = relationship("Group", back_populates="members")
    user = relationship("User")
