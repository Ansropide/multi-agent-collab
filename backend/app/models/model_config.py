import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, func

from ..database import Base


def uuid4_str():
    return str(uuid.uuid4())


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(String, primary_key=True, default=uuid4_str)
    name = Column(String(200), nullable=False)
    llm_base_url = Column(String(500), nullable=False)
    llm_api_key = Column(String(500), nullable=False)
    llm_model = Column(String(100), nullable=False, default="gpt-3.5-turbo")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
