from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.model_config import ModelConfig
from ..schemas.model_config import ModelConfigCreate, ModelConfigUpdate, ModelConfigResponse

router = APIRouter(prefix="/api/model-configs", tags=["model-configs"])


@router.post("", response_model=ModelConfigResponse, status_code=201)
async def create_model_config(data: ModelConfigCreate, db: AsyncSession = Depends(get_db)):
    config = ModelConfig(
        name=data.name.strip(),
        llm_base_url=data.llm_base_url.rstrip("/"),
        llm_api_key=data.llm_api_key,
        llm_model=data.llm_model or "gpt-3.5-turbo",
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.get("", response_model=list[ModelConfigResponse])
async def list_model_configs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).order_by(ModelConfig.created_at.desc()))
    return result.scalars().all()


@router.get("/{config_id}", response_model=ModelConfigResponse)
async def get_model_config(config_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    return config


@router.put("/{config_id}", response_model=ModelConfigResponse)
async def update_model_config(config_id: str, data: ModelConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "llm_base_url" in update_data and update_data["llm_base_url"]:
        update_data["llm_base_url"] = update_data["llm_base_url"].rstrip("/")

    for key, value in update_data.items():
        setattr(config, key, value)

    await db.commit()
    await db.refresh(config)
    return config


@router.delete("/{config_id}", status_code=204)
async def delete_model_config(config_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    await db.delete(config)
    await db.commit()
