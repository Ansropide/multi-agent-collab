from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MessageSend(BaseModel):
    content: str = Field(..., min_length=1, description="用户消息内容")


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageListResponse(BaseModel):
    items: list[MessageResponse]
    total: int


class MessageAcceptResponse(BaseModel):
    message_id: str
    conversation_id: str
