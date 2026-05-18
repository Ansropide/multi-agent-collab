from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: Optional[str] = None
    agent_ids: list[str] = []


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


class AgentInfo(BaseModel):
    id: str
    name: str
    llm_model: str
    role: Optional[str] = None

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    agent_id: Optional[str] = None
    title: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    agents: list[AgentInfo] = []

    model_config = {"from_attributes": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_orm_with_agents(cls, conv, agents: list[AgentInfo]):
        """Create response from ORM object, skipping lazy-loaded agents field."""
        data = {
            'id': conv.id,
            'agent_id': conv.agent_id,
            'title': conv.title,
            'status': conv.status,
            'created_at': conv.created_at,
            'updated_at': conv.updated_at,
            'agents': agents,
        }
        return cls(**data)


class ConversationListResponse(BaseModel):
    items: list[ConversationResponse]
    total: int
