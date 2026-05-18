from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ModelConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="配置名称")
    llm_base_url: str = Field(..., description="LLM API 地址")
    llm_api_key: str = Field(..., description="API Key")
    llm_model: str = Field(default="gpt-3.5-turbo", description="模型名称")


class ModelConfigUpdate(BaseModel):
    name: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None


class ModelConfigResponse(BaseModel):
    id: str
    name: str
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
