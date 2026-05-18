import json
import logging
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session_factory
from ..models import Agent, Conversation, ConversationAgent, Message, Task
from .llm_client import LLMClient
from .stream_manager import stream_manager

logger = logging.getLogger(__name__)

DECOMPOSITION_PROMPT_TEMPLATE = """你是一个任务分解专家。请将以下用户请求拆分为 2-5 个具体的子任务。

要求：
1. 每个子任务应当是可以独立执行的步骤
2. 子任务之间按逻辑顺序排列
3. 只返回 JSON 数组，不要任何解释

格式：
[{"name": "子任务名称", "description": "子任务具体描述"}]

用户请求：__USER_MESSAGE__"""

GROUP_DECOMPOSITION_PROMPT_TEMPLATE = """你是一个群聊协作任务规划器。请将以下用户请求拆分为 2-5 个具体的子任务，并分配给群聊中最合适的智能体。

可用智能体：
__AVAILABLE_AGENTS__

要求：
1. 每个子任务应当是可以独立执行的步骤
2. 根据每个智能体的专长分配任务
3. 子任务之间按逻辑顺序排列
4. 只返回 JSON 数组，不要任何解释

格式：
[{"name": "子任务名称", "description": "子任务具体描述", "assign_to": "agent_id"}]

用户请求：__USER_MESSAGE__"""

SYNTHESIS_PROMPT_TEMPLATE = """请将以下子任务的执行结果综合成一个完整的回答，回应用户的原始请求。

用户请求：__USER_MESSAGE__

子任务结果：
__TASK_RESULTS__

请用自然、流畅的语言给出最终回答。"""


async def execute(conversation_id: str, message_id: str, user_message: str):
    """Main agent execution pipeline: decompose → execute → synthesize."""
    logger.info(f"Agent execute start: conv={conversation_id[:8]} msg={message_id[:8]}")
    try:
        async with async_session_factory() as db:
            conv_result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
            conv = conv_result.scalar_one_or_none()
            if not conv:
                logger.warning(f"Conversation {conversation_id[:8]} not found")
                return

            agent_result = await db.execute(select(Agent).where(Agent.id == conv.agent_id))
            agent = agent_result.scalar_one_or_none()
            if not agent:
                logger.warning(f"Agent for conv {conversation_id[:8]} not found")
                return

            logger.info(f"Found agent: {agent.name}, model: {agent.llm_model}")

            history_result = await db.execute(
                select(Message).where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc()).limit(10)
            )
            history_messages = list(reversed(history_result.scalars().all()))

            llm = LLMClient(agent.llm_base_url, agent.llm_api_key, agent.llm_model)

            # Step 1: Decompose
            logger.info("Step 1: Decomposing task...")
            task_list = await _decompose(llm, user_message, db, conversation_id, message_id, agent.id)
            logger.info(f"Decomposed into {len(task_list)} tasks")

            # Step 2: Execute each subtask
            task_results = []
            for task in task_list:
                task_id = task["id"]

                await _update_task(db, task_id, status="running", started_at=datetime.utcnow())
                await stream_manager.publish(conversation_id, message_id, "task_update", {
                    "task_id": task_id, "sequence": task["sequence"],
                    "name": task["name"], "status": "running",
                })

                try:
                    context_messages = _build_context(agent.system_prompt, history_messages, user_message, task_results)
                    context_messages.append({
                        "role": "user",
                        "content": f"请执行以下子任务：\n\n名称：{task['name']}\n描述：{task['description']}\n\n上下文：已有完成的任务结果：{json.dumps([{'name': r['name'], 'result': r['result'][:200]} for r in task_results], ensure_ascii=False) if task_results else '暂无'}"
                    })

                    result = await llm.chat(context_messages)
                    await _update_task(db, task_id, status="completed", result=result, completed_at=datetime.utcnow())
                    task_results.append({"name": task["name"], "result": result})

                    await stream_manager.publish(conversation_id, message_id, "task_update", {
                        "task_id": task_id, "sequence": task["sequence"],
                        "name": task["name"], "status": "completed", "result": result[:500],
                    })
                except Exception as e:
                    logger.error(f"Task {task_id[:8]} failed: {e}")
                    await _update_task(db, task_id, status="failed", error_message=str(e), completed_at=datetime.utcnow())
                    task_results.append({"name": task["name"], "result": f"错误: {str(e)}"})
                    await stream_manager.publish(conversation_id, message_id, "task_update", {
                        "task_id": task_id, "sequence": task["sequence"],
                        "name": task["name"], "status": "failed", "error_message": str(e),
                    })

            # Step 3: Synthesize (streaming)
            logger.info("Step 3: Synthesizing final response (streaming)...")
            full_content = ""
            try:
                async for token in _synthesize_stream(llm, user_message, task_results, agent.system_prompt,
                                                       conversation_id, message_id):
                    full_content += token
                final_content = full_content
            except Exception as e:
                logger.error(f"Synthesis failed: {e}")
                if not full_content:
                    fallback_parts = [f"## {r['name']}\n\n{r['result']}" for r in task_results]
                    final_content = "## 执行完成\n\n" + "\n\n".join(fallback_parts) if fallback_parts else "执行完成，但未获取到结果。"
                else:
                    final_content = full_content

            # Update assistant message in DB
            msg_result = await db.execute(select(Message).where(Message.id == message_id))
            msg = msg_result.scalar_one_or_none()
            if msg:
                msg.content = final_content
                await db.commit()
                logger.info(f"Updated assistant message {message_id[:8]} with final content")

            await stream_manager.publish(conversation_id, message_id, "message_complete", {
                "message_id": message_id, "content": final_content,
            })
            await stream_manager.publish_done(conversation_id, message_id)
            logger.info("Agent execute completed successfully")
    except Exception as e:
        logger.exception(f"Agent execute failed with unexpected error: {e}")


async def _decompose(
    llm: LLMClient,
    user_message: str,
    db: AsyncSession,
    conversation_id: str,
    message_id: str,
    agent_id: str,
) -> list[dict]:
    prompt = DECOMPOSITION_PROMPT_TEMPLATE.replace("__USER_MESSAGE__", user_message)
    try:
        response = await llm.chat(
            [{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response)
        tasks = parsed if isinstance(parsed, list) else parsed.get("tasks", parsed.get("subtasks", []))
        if not tasks or not isinstance(tasks, list):
            raise ValueError("empty task list")
        logger.info(f"LLM decomposed into {len(tasks)} tasks")
    except Exception as e:
        logger.warning(f"Decomposition failed, using fallback: {e}")
        tasks = [{"name": "执行", "description": user_message}]

    saved_tasks = []
    for i, t in enumerate(tasks, 1):
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id, message_id=message_id, conversation_id=conversation_id,
            agent_id=agent_id, sequence=i, name=t.get("name", f"子任务 {i}")[:200], status="pending",
        )
        db.add(task)
        saved_tasks.append({
            "id": task_id, "sequence": i, "name": task.name,
            "description": t.get("description", ""),
        })

    await db.commit()
    logger.info(f"Saved {len(saved_tasks)} tasks to DB")

    for t in saved_tasks:
        await stream_manager.publish(conversation_id, message_id, "task_update", {
            "task_id": t["id"], "sequence": t["sequence"],
            "name": t["name"], "status": "pending",
        })

    return saved_tasks


async def _update_task(db: AsyncSession, task_id: str, **kwargs):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task:
        for key, value in kwargs.items():
            setattr(task, key, value)
        await db.commit()


async def _synthesize_stream(
    llm: LLMClient,
    user_message: str,
    task_results: list[dict],
    system_prompt: str,
    conversation_id: str,
    message_id: str,
):
    """Streaming synthesis: yields tokens and publishes each as SSE message_token."""
    results_text = "\n\n".join([f"### {r['name']}\n\n{r['result']}" for r in task_results])
    prompt = SYNTHESIS_PROMPT_TEMPLATE.replace("__USER_MESSAGE__", user_message).replace("__TASK_RESULTS__", results_text)
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]

    async for token in llm.chat_stream(messages):
        await stream_manager.publish(conversation_id, message_id, "message_token", {"token": token})
        yield token


def _build_context(
    system_prompt: str,
    history: list[Message],
    user_message: str,
    task_results: list[dict],
) -> list[dict]:
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    return messages


# ---------------------------------------------------------------------------
# Group (multi-agent) execution
# ---------------------------------------------------------------------------

async def execute_group(conversation_id: str, message_id: str, user_message: str):
    """Multi-agent group execution: planner → workers → synthesis."""
    logger.info(f"Group execute start: conv={conversation_id[:8]} msg={message_id[:8]}")
    try:
        async with async_session_factory() as db:
            conv_result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
            conv = conv_result.scalar_one_or_none()
            if not conv:
                logger.warning(f"Conversation {conversation_id[:8]} not found")
                return

            # Load all agents in this conversation (ordered by sort_order)
            ca_result = await db.execute(
                select(ConversationAgent).where(ConversationAgent.conversation_id == conversation_id)
                .order_by(ConversationAgent.sort_order)
            )
            ca_list = ca_result.scalars().all()
            if not ca_list:
                logger.warning(f"No agents in conversation {conversation_id[:8]}, falling back to single-agent")
                await execute(conversation_id, message_id, user_message)
                return

            agents = []
            for ca in ca_list:
                agent_result = await db.execute(select(Agent).where(Agent.id == ca.agent_id))
                agent = agent_result.scalar_one_or_none()
                if agent:
                    agents.append({"agent": agent, "role": ca.role, "ca_id": ca.id})

            if not agents:
                logger.warning("No valid agents found")
                return

            planner = agents[0]
            workers = agents[1:]
            logger.info(f"Group: planner={planner['agent'].name}, workers={[w['agent'].name for w in workers]}")

            # Load history
            history_result = await db.execute(
                select(Message).where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc()).limit(10)
            )
            history_messages = list(reversed(history_result.scalars().all()))

            # Step 1: Planner decomposes with agent routing
            logger.info("Step 1: Group decomposition with agent routing...")
            planner_llm = LLMClient(planner['agent'].llm_base_url, planner['agent'].llm_api_key, planner['agent'].llm_model)
            task_list = await _group_decompose(planner_llm, user_message, agents, db, conversation_id, message_id, planner['agent'].id)
            logger.info(f"Group decomposed into {len(task_list)} tasks")

            # Step 2: Execute each subtask with assigned agent
            task_results = []
            for task_data in task_list:
                task_id = task_data["id"]
                assigned_agent_id = task_data.get("assign_to")
                # Find which agent this task is assigned to
                target_agent_info = None
                for a in agents:
                    if a['agent'].id == assigned_agent_id:
                        target_agent_info = a
                        break
                if not target_agent_info:
                    # Fallback to planner if assignment invalid
                    target_agent_info = planner

                target_agent = target_agent_info['agent']

                await _update_task(db, task_id, status="running", started_at=datetime.utcnow())
                await stream_manager.publish(conversation_id, message_id, "task_update", {
                    "task_id": task_id, "sequence": task_data["sequence"],
                    "name": task_data["name"], "status": "running",
                    "agent_id": target_agent.id, "agent_name": target_agent.name,
                })

                try:
                    agent_llm = LLMClient(target_agent.llm_base_url, target_agent.llm_api_key, target_agent.llm_model)
                    context_messages = _build_group_context(
                        target_agent.system_prompt, history_messages, user_message, task_results
                    )
                    context_messages.append({
                        "role": "user",
                        "content": f"请执行以下子任务：\n\n名称：{task_data['name']}\n描述：{task_data['description']}\n\n上下文：已有完成的任务结果：{json.dumps([{'name': r['name'], 'result': r['result'][:200]} for r in task_results], ensure_ascii=False) if task_results else '暂无'}"
                    })

                    result = await agent_llm.chat(context_messages)
                    await _update_task(db, task_id, status="completed", result=result, completed_at=datetime.utcnow())
                    task_results.append({"name": task_data["name"], "result": result, "agent_name": target_agent.name})

                    await stream_manager.publish(conversation_id, message_id, "task_update", {
                        "task_id": task_id, "sequence": task_data["sequence"],
                        "name": task_data["name"], "status": "completed", "result": result[:500],
                        "agent_id": target_agent.id, "agent_name": target_agent.name,
                    })
                except Exception as e:
                    logger.error(f"Task {task_id[:8]} failed: {e}")
                    await _update_task(db, task_id, status="failed", error_message=str(e), completed_at=datetime.utcnow())
                    task_results.append({"name": task_data["name"], "result": f"错误: {str(e)}", "agent_name": target_agent.name})
                    await stream_manager.publish(conversation_id, message_id, "task_update", {
                        "task_id": task_id, "sequence": task_data["sequence"],
                        "name": task_data["name"], "status": "failed", "error_message": str(e),
                        "agent_id": target_agent.id, "agent_name": target_agent.name,
                    })

            # Step 3: Planner synthesizes final response
            logger.info("Step 3: Group synthesis (streaming)...")
            full_content = ""
            try:
                async for token in _synthesize_stream(planner_llm, user_message, task_results,
                                                       planner['agent'].system_prompt,
                                                       conversation_id, message_id):
                    full_content += token
                final_content = full_content
            except Exception as e:
                logger.error(f"Group synthesis failed: {e}")
                if not full_content:
                    fallback_parts = [f"## {r['name']}（{r.get('agent_name', '')}）\n\n{r['result']}" for r in task_results]
                    final_content = "## 执行完成\n\n" + "\n\n".join(fallback_parts) if fallback_parts else "执行完成，但未获取到结果。"
                else:
                    final_content = full_content

            # Update assistant message
            msg_result = await db.execute(select(Message).where(Message.id == message_id))
            msg = msg_result.scalar_one_or_none()
            if msg:
                msg.content = final_content
                await db.commit()

            await stream_manager.publish(conversation_id, message_id, "message_complete", {
                "message_id": message_id, "content": final_content,
            })
            await stream_manager.publish_done(conversation_id, message_id)
            logger.info("Group execute completed successfully")
    except Exception as e:
        logger.exception(f"Group execute failed with unexpected error: {e}")


async def _group_decompose(
    llm: LLMClient,
    user_message: str,
    agents: list[dict],
    db: AsyncSession,
    conversation_id: str,
    message_id: str,
    planner_agent_id: str,
) -> list[dict]:
    """Decompose with agent assignment. Each task gets assigned to an agent_id."""
    # Build available agents description
    agent_desc_lines = []
    for i, a in enumerate(agents):
        agent = a['agent']
        role_label = "规划器" if a['role'] == 'planner' else "执行器"
        system_preview = agent.system_prompt[:100].replace("\n", " ")
        agent_desc_lines.append(f"{i+1}. [{role_label}] {agent.name} (id: {agent.id})\n   系统提示摘要: {system_preview}")

    agents_text = "\n".join(agent_desc_lines)
    prompt = GROUP_DECOMPOSITION_PROMPT_TEMPLATE.replace("__AVAILABLE_AGENTS__", agents_text).replace("__USER_MESSAGE__", user_message)

    try:
        response = await llm.chat(
            [{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response)
        tasks = parsed if isinstance(parsed, list) else parsed.get("tasks", parsed.get("subtasks", []))
        if not tasks or not isinstance(tasks, list):
            raise ValueError("empty task list")

        # Validate/clean assign_to fields
        valid_agent_ids = {a['agent'].id for a in agents}
        for t in tasks:
            if t.get("assign_to") not in valid_agent_ids:
                t["assign_to"] = planner_agent_id  # fallback to planner

        logger.info(f"Group decomposed into {len(tasks)} tasks with assignments")
    except Exception as e:
        logger.warning(f"Group decomposition failed, using fallback: {e}")
        tasks = [{"name": "执行", "description": user_message, "assign_to": planner_agent_id}]

    # Save tasks to DB
    saved_tasks = []
    for i, t in enumerate(tasks, 1):
        task_id = str(uuid.uuid4())
        assign_to = t.get("assign_to", planner_agent_id)
        task = Task(
            id=task_id, message_id=message_id, conversation_id=conversation_id,
            agent_id=assign_to, sequence=i, name=t.get("name", f"子任务 {i}")[:200], status="pending",
        )
        db.add(task)
        saved_tasks.append({
            "id": task_id, "sequence": i, "name": task.name,
            "description": t.get("description", ""),
            "assign_to": assign_to,
        })

    await db.commit()
    logger.info(f"Saved {len(saved_tasks)} group tasks to DB")

    for t in saved_tasks:
        await stream_manager.publish(conversation_id, message_id, "task_update", {
            "task_id": t["id"], "sequence": t["sequence"],
            "name": t["name"], "status": "pending",
            "agent_id": t["assign_to"],
        })

    return saved_tasks


def _build_group_context(
    system_prompt: str,
    history: list[Message],
    user_message: str,
    task_results: list[dict],
) -> list[dict]:
    """Build context for group worker execution."""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    return messages
