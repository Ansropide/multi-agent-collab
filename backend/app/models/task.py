import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from ..database import Base


def uuid4_str():
    return str(uuid.uuid4())


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=uuid4_str)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    sequence = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    message = relationship("Message", back_populates="tasks")
    conversation = relationship("Conversation", back_populates="tasks")
    agent = relationship("Agent", back_populates="tasks")
