from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskResponse(BaseModel):
    id: str
    message_id: str
    conversation_id: str
    agent_id: str
    sequence: int
    name: str
    status: str
    result: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskUpdateEvent(BaseModel):
    task_id: str
    sequence: int
    name: str
    status: str
    result: Optional[str] = None
    error_message: Optional[str] = None
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
