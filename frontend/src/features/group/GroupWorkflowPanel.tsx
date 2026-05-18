import type { AgentInfo } from '../../types/conversation';
import type { Task } from '../../types/task';
import AgentWorkflowCard from './AgentWorkflowCard';

interface Props {
  agents: AgentInfo[];
  tasks: Task[];
}

type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

function getAgentStatus(agentId: string, tasks: Task[]): {
  status: AgentStatus;
  currentTask: Task | null;
  result: string | null;
} {
  const agentTasks = tasks.filter(t => t.agent_id === agentId);
  if (agentTasks.length === 0) {
    return { status: 'idle', currentTask: null, result: null };
  }
  // Find the latest active task
  const running = agentTasks.find(t => t.status === 'running');
  if (running) return { status: 'running', currentTask: running, result: null };

  const pending = agentTasks.find(t => t.status === 'pending');
  if (pending) return { status: 'idle', currentTask: pending, result: null };

  const failed = agentTasks.find(t => t.status === 'failed');
  if (failed) return { status: 'failed', currentTask: failed, result: failed.error_message || null };

  // All completed
  const completed = agentTasks.filter(t => t.status === 'completed');
  if (completed.length > 0) {
    const last = completed[completed.length - 1];
    return { status: 'completed', currentTask: last, result: last.result || null };
  }

  return { status: 'idle', currentTask: null, result: null };
}

function statusDisplay(status: AgentStatus): { label: string; icon: string } {
  switch (status) {
    case 'idle': return { label: '待命中', icon: '⏸️' };
    case 'running': return { label: '执行中...', icon: '🔄' };
    case 'completed': return { label: '已完成', icon: '✅' };
    case 'failed': return { label: '失败', icon: '❌' };
  }
}

export default function GroupWorkflowPanel({ agents, tasks }: Props) {
  const allDone = agents.length > 0 && agents.every(a => {
    const { status } = getAgentStatus(a.id, tasks);
    return status === 'completed' || status === 'failed';
  });
  const hasAnyTask = tasks.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">群聊工作流</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {agents.map((agent, idx) => {
          const { status, currentTask, result } = getAgentStatus(agent.id, tasks);
          const { label, icon } = statusDisplay(status);
          return (
            <AgentWorkflowCard
              key={agent.id}
              name={agent.name}
              model={agent.llm_model}
              role={agent.role || (idx === 0 ? 'planner' : 'worker')}
              index={idx}
              currentTask={currentTask}
              statusLabel={label}
              statusIcon={icon}
              result={result}
            />
          );
        })}

        {!hasAnyTask && agents.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center py-4">
            发送消息后，将在此处显示各智能体的工作状态
          </p>
        )}

        {hasAnyTask && allDone && (
          <div className="text-center py-2 text-xs text-green-600 font-medium">
            全部完成 ✓
          </div>
        )}
      </div>
    </div>
  );
}
