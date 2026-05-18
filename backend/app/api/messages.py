import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Agent, Conversation, ConversationAgent, Message, Task
from ..schemas.message import MessageSend, MessageResponse, MessageListResponse, MessageAcceptResponse
from ..schemas.task import TaskResponse
from ..services.agent_engine import execute as agent_execute, execute_group
from ..services.stream_manager import stream_manager
import logging

logger = logging.getLogger(__name__)


async def safe_execute(conversation_id: str, message_id: str, user_message: str):
    """Wrapper that logs errors from background agent execution."""
    try:
        await agent_execute(conversation_id, message_id, user_message)
    except Exception as e:
        logger.exception(f"Agent execution failed: {e}")


async def safe_execute_group(conversation_id: str, message_id: str, user_message: str):
    """Wrapper that logs errors from background group agent execution."""
    try:
        await execute_group(conversation_id, message_id, user_message)
    except Exception as e:
        logger.exception(f"Group execution failed: {e}")

router = APIRouter(tags=["messages"])

_cancellation_flags: dict[str, bool] = {}


@router.get("/api/conversations/{conv_id}/messages", response_model=MessageListResponse)
async def list_messages(conv_id: str, page: int = 1, per_page: int = 100,
                         db: AsyncSession = Depends(get_db)):
    total_query = select(func.count(Message.id)).where(Message.conversation_id == conv_id)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    query = (select(Message).where(Message.conversation_id == conv_id)
             .order_by(Message.created_at.asc())
             .offset((page - 1) * per_page).limit(per_page))
    result = await db.execute(query)
    messages = result.scalars().all()

    return MessageListResponse(
        items=[MessageResponse.model_validate(m) for m in messages],
        total=total,
    )


@router.post("/api/conversations/{conv_id}/messages", response_model=MessageAcceptResponse, status_code=202)
async def send_message(conv_id: str, data: MessageSend, background_tasks: BackgroundTasks,
                        db: AsyncSession = Depends(get_db)):
    conv_result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = conv_result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    # Check if group conversation (has multiple agents via conversation_agents)
    ca_result = await db.execute(
        select(func.count()).select_from(ConversationAgent)
        .where(ConversationAgent.conversation_id == conv_id)
    )
    agent_count = ca_result.scalar() or 0
    is_group = agent_count > 1

    # Save user message
    user_msg = Message(conversation_id=conv_id, role="user", content=data.content)
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # Create assistant placeholder message
    assistant_msg = Message(conversation_id=conv_id, role="assistant", content="")
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    # Launch background execution
    if is_group:
        background_tasks.add_task(safe_execute_group, conv_id, assistant_msg.id, data.content)
    else:
        background_tasks.add_task(safe_execute, conv_id, assistant_msg.id, data.content)

    return MessageAcceptResponse(message_id=assistant_msg.id, conversation_id=conv_id)


@router.get("/api/conversations/{conv_id}/messages/{msg_id}/tasks", response_model=list[TaskResponse])
async def get_message_tasks(conv_id: str, msg_id: str, db: AsyncSession = Depends(get_db)):
    query = (select(Task).where(Task.message_id == msg_id)
             .order_by(Task.sequence.asc()))
    result = await db.execute(query)
    tasks = result.scalars().all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/api/conversations/{conv_id}/messages/{msg_id}/stream")
async def stream_tasks(conv_id: str, msg_id: str, db: AsyncSession = Depends(get_db)):
    # Check if message already completed
    msg_result = await db.execute(select(Message).where(Message.id == msg_id))
    msg = msg_result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")

    # If already completed, return tasks immediately then close
    if msg.content:
        query = (select(Task).where(Task.message_id == msg_id).order_by(Task.sequence.asc()))
        task_result = await db.execute(query)
        tasks = task_result.scalars().all()

        # Load agent names
        task_agent_names = {}
        for t in tasks:
            if t.agent_id and t.agent_id not in task_agent_names:
                agent_r = await db.execute(select(Agent).where(Agent.id == t.agent_id))
                agent = agent_r.scalar_one_or_none()
                task_agent_names[t.agent_id] = agent.name if agent else None

        async def immediate_done():
            for t in tasks:
                yield f"event: task_update\ndata: {json.dumps({'task_id': t.id, 'sequence': t.sequence, 'name': t.name, 'status': t.status, 'result': t.result[:500] if t.result else None, 'error_message': t.error_message, 'agent_id': t.agent_id, 'agent_name': task_agent_names.get(t.agent_id)}, ensure_ascii=False)}\n\n"
            yield f"event: message_complete\ndata: {json.dumps({'message_id': msg_id, 'content': msg.content}, ensure_ascii=False)}\n\n"

        return StreamingResponse(immediate_done(), media_type="text/event-stream")

    async def event_generator():
        queue = await stream_manager.subscribe(conv_id, msg_id)
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
                    continue

                if payload.get("type") == "done":
                    break
                yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'], ensure_ascii=False)}\n\n"
                if payload.get("event") == "message_complete":
                    break
        finally:
            await stream_manager.unsubscribe(conv_id, msg_id, id(queue))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/api/conversations/{conv_id}/messages/{msg_id}/cancel")
async def cancel_message(conv_id: str, msg_id: str):
    _cancellation_flags[msg_id] = True
    return {"status": "cancelled"}


def is_cancelled(msg_id: str) -> bool:
    return _cancellation_flags.get(msg_id, False)
