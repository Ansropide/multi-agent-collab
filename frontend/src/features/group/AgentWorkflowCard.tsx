import type { Task } from '../../types/task';

const AGENT_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#ca8a04', '#16a34a'];

interface Props {
  name: string;
  model: string;
  role: string;
  index: number;
  currentTask: Task | null;
  statusLabel: string;
  statusIcon: string;
  result: string | null;
}

export default function AgentWorkflowCard({
  name, model, role, index,
  currentTask, statusLabel, statusIcon, result,
}: Props) {
  const color = AGENT_COLORS[index % AGENT_COLORS.length];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-gray-100">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: color }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-800 truncate">{name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
              {role === 'planner' ? '规划器' : '执行器'}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 truncate">{model}</div>
        </div>
      </div>

      {/* Status body */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{statusIcon}</span>
          <span className="text-[11px] font-medium text-gray-600">{statusLabel}</span>
        </div>
        {currentTask && (
          <div className="mt-1.5 text-[11px] text-gray-500 truncate">
            任务: {currentTask.name}
          </div>
        )}
        {result && (
          <div className="mt-1.5 text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
            {result.length > 120 ? result.slice(0, 120) + '...' : result}
          </div>
        )}
      </div>
    </div>
  );
}
