from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Agent, Conversation, ConversationAgent
from ..schemas.conversation import (
    ConversationCreate, ConversationUpdate, ConversationResponse,
    ConversationListResponse, AgentInfo,
)

router = APIRouter(tags=["conversations"])


async def _load_conv_agents(conv: Conversation, db: AsyncSession) -> list[AgentInfo]:
    """Load agents associated with a conversation."""
    result = await db.execute(
        select(ConversationAgent).where(ConversationAgent.conversation_id == conv.id)
        .order_by(ConversationAgent.sort_order)
    )
    ca_list = result.scalars().all()
    agents_info = []
    for ca in ca_list:
        agent_result = await db.execute(select(Agent).where(Agent.id == ca.agent_id))
        agent = agent_result.scalar_one_or_none()
        if agent:
            agents_info.append(AgentInfo(
                id=agent.id, name=agent.name, llm_model=agent.llm_model, role=ca.role,
            ))
    return agents_info


async def _conv_to_response(conv: Conversation, db: AsyncSession) -> ConversationResponse:
    agents = await _load_conv_agents(conv, db)
    return ConversationResponse.from_orm_with_agents(conv, agents)


@router.post("/api/conversations", response_model=ConversationResponse, status_code=201)
async def create_group_conversation(data: ConversationCreate, db: AsyncSession = Depends(get_db)):
    """Create a conversation. If agent_ids provided, creates a group conversation."""
    if not data.agent_ids:
        raise HTTPException(status_code=400, detail="需要至少一个智能体")

    # Load all agents
    agents = []
    for aid in data.agent_ids:
        result = await db.execute(select(Agent).where(Agent.id == aid))
        agent = result.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=404, detail=f"智能体 {aid} 不存在")
        agents.append(agent)

    first_agent = agents[0]
    conv = Conversation(
        agent_id=first_agent.id,
        title=data.title or f"{first_agent.name} 群聊",
    )
    db.add(conv)
    await db.flush()

    # Create conversation_agent associations
    for idx, agent in enumerate(agents):
        ca = ConversationAgent(
            conversation_id=conv.id,
            agent_id=agent.id,
            role="planner" if idx == 0 else "worker",
            sort_order=idx,
        )
        db.add(ca)

    await db.commit()
    await db.refresh(conv)
    return await _conv_to_response(conv, db)


@router.post("/api/agents/{agent_id}/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(agent_id: str, data: ConversationCreate, db: AsyncSession = Depends(get_db)):
    """Legacy: create a single-agent conversation."""
    agent_result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    conv = Conversation(
        agent_id=agent_id,
        title=data.title or f"{agent.name} 的会话",
    )
    db.add(conv)
    await db.flush()

    # Auto-create conversation_agent association
    ca = ConversationAgent(
        conversation_id=conv.id, agent_id=agent_id,
        role="planner", sort_order=0,
    )
    db.add(ca)
    await db.commit()
    await db.refresh(conv)
    return await _conv_to_response(conv, db)


@router.get("/api/conversations", response_model=ConversationListResponse)
async def list_all_conversations(page: int = 1, per_page: int = 50, status: str = None,
                                  db: AsyncSession = Depends(get_db)):
    conditions = []
    if status:
        conditions.append(Conversation.status == status)

    total_query = select(func.count(Conversation.id)).where(*conditions)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    query = (select(Conversation).where(*conditions)
             .order_by(Conversation.updated_at.desc())
             .offset((page - 1) * per_page).limit(per_page))
    result = await db.execute(query)
    conversations = result.scalars().all()

    items = [await _conv_to_response(c, db) for c in conversations]

    return ConversationListResponse(items=items, total=total)


@router.get("/api/agents/{agent_id}/conversations", response_model=ConversationListResponse)
async def list_conversations(agent_id: str, page: int = 1, per_page: int = 50, status: str = None,
                              db: AsyncSession = Depends(get_db)):
    # Find conversations that include this agent (via conversation_agents or as creator)
    ca_sub = select(ConversationAgent.conversation_id).where(ConversationAgent.agent_id == agent_id).subquery()
    conditions = [
        (Conversation.id.in_(select(ca_sub))) | (Conversation.agent_id == agent_id)
    ]
    if status:
        conditions.append(Conversation.status == status)

    total_query = select(func.count(Conversation.id)).where(*conditions)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    query = (select(Conversation).where(*conditions)
             .order_by(Conversation.updated_at.desc())
             .offset((page - 1) * per_page).limit(per_page))
    result = await db.execute(query)
    conversations = result.scalars().all()

    items = [await _conv_to_response(c, db) for c in conversations]

    return ConversationListResponse(items=items, total=total)


@router.get("/api/conversations/{conv_id}", response_model=ConversationResponse)
async def get_conversation(conv_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    return await _conv_to_response(conv, db)


@router.patch("/api/conversations/{conv_id}", response_model=ConversationResponse)
async def update_conversation(conv_id: str, data: ConversationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(conv, key, value)

    await db.commit()
    await db.refresh(conv)
    return await _conv_to_response(conv, db)


@router.delete("/api/conversations/{conv_id}", status_code=204)
async def delete_conversation(conv_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    await db.delete(conv)
    await db.commit()


# --- Agent management within a conversation ---

@router.post("/api/conversations/{conv_id}/agents", status_code=201)
async def add_agent_to_conversation(conv_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    agent_id = data.get("agent_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="需要 agent_id")

    conv_result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = conv_result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    agent_result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    # Check if already in conversation
    existing = await db.execute(
        select(ConversationAgent).where(
            ConversationAgent.conversation_id == conv_id,
            ConversationAgent.agent_id == agent_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该智能体已在会话中")

    # Get max sort_order
    max_order_result = await db.execute(
        select(func.max(ConversationAgent.sort_order)).where(
            ConversationAgent.conversation_id == conv_id
        )
    )
    max_order = max_order_result.scalar() or 0

    ca = ConversationAgent(
        conversation_id=conv_id, agent_id=agent_id,
        role="worker", sort_order=max_order + 1,
    )
    db.add(ca)
    await db.commit()
    return {"status": "ok"}


@router.delete("/api/conversations/{conv_id}/agents/{agent_id}", status_code=204)
async def remove_agent_from_conversation(conv_id: str, agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConversationAgent).where(
            ConversationAgent.conversation_id == conv_id,
            ConversationAgent.agent_id == agent_id,
        )
    )
    ca = result.scalar_one_or_none()
    if not ca:
        raise HTTPException(status_code=404, detail="关联不存在")
    await db.delete(ca)
    await db.commit()


@router.get("/api/conversations/{conv_id}/agents", response_model=list[AgentInfo])
async def list_conversation_agents(conv_id: str, db: AsyncSession = Depends(get_db)):
    conv_result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = conv_result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")
    return await _load_conv_agents(conv, db)
