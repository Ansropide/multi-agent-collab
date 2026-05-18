from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Agent
from ..schemas.agent import AgentCreate, AgentUpdate, AgentResponse, AgentListResponse

router = APIRouter(prefix="/api/agents", tags=["agents"])


def generate_name(prompt: str) -> str:
    name = prompt.strip()[:40]
    if len(prompt) > 40:
        name += "..."
    return name if name else "未命名智能体"


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(data: AgentCreate, db: AsyncSession = Depends(get_db)):
    agent = Agent(
        name=generate_name(data.system_prompt),
        system_prompt=data.system_prompt,
        llm_base_url=data.llm_base_url.rstrip("/"),
        llm_api_key=data.llm_api_key,
        llm_model=data.llm_model or "gpt-3.5-turbo",
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get("", response_model=AgentListResponse)
async def list_agents(page: int = 1, per_page: int = 20, db: AsyncSession = Depends(get_db)):
    total_query = select(func.count(Agent.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    query = select(Agent).order_by(Agent.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    agents = result.scalars().all()

    return AgentListResponse(items=[AgentResponse.model_validate(a) for a in agents], total=total)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, data: AgentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "llm_base_url" in update_data and update_data["llm_base_url"]:
        update_data["llm_base_url"] = update_data["llm_base_url"].rstrip("/")
    if "system_prompt" in update_data and update_data["system_prompt"]:
        update_data["name"] = generate_name(update_data["system_prompt"])

    for key, value in update_data.items():
        setattr(agent, key, value)

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    await db.delete(agent)
    await db.commit()
