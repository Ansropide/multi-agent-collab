import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from ..database import Base


def uuid4_str():
    return str(uuid.uuid4())


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=uuid4_str)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    agent_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
    tasks = relationship("Task", back_populates="message", cascade="all, delete-orphan")
