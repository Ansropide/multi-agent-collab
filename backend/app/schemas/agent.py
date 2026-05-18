from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    system_prompt: str = Field(..., min_length=1, description="智能体系统提示词")
    llm_base_url: str = Field(..., description="LLM API 地址")
    llm_api_key: str = Field(..., description="API Key")
    llm_model: str = Field(default="gpt-3.5-turbo", description="模型名称")


class AgentUpdate(BaseModel):
    system_prompt: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None


class AgentResponse(BaseModel):
    id: str
    name: str
    system_prompt: str
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    items: list[AgentResponse]
    total: int
