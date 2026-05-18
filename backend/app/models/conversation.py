import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from ..database import Base


def uuid4_str():
    return str(uuid.uuid4())


class ConversationAgent(Base):
    """Many-to-many association between conversations and agents."""
    __tablename__ = "conversation_agents"

    id = Column(String, primary_key=True, default=uuid4_str)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    agent = relationship("Agent", foreign_keys=[agent_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=uuid4_str)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    agent = relationship("Agent", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",
                            order_by="Message.created_at")
    tasks = relationship("Task", back_populates="conversation", cascade="all, delete-orphan")
    # Many-to-many through conversation_agents
    agents = relationship("Agent", secondary="conversation_agents", viewonly=True,
                          order_by="ConversationAgent.sort_order")
