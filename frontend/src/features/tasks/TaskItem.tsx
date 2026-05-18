import type { Task } from '../../types/task';

interface Props {
  task: Task;
}

const statusConfig = {
  pending: { bg: 'bg-gray-100', icon: '○', text: 'text-gray-500', label: '等待中' },
  running: { bg: 'bg-blue-100', icon: '◎', text: 'text-blue-600', label: '执行中' },
  completed: { bg: 'bg-green-100', icon: '●', text: 'text-green-600', label: '已完成' },
  failed: { bg: 'bg-red-100', icon: '✕', text: 'text-red-600', label: '失败' },
};

export default function TaskItem({ task }: Props) {
  const config = statusConfig[task.status] || statusConfig.pending;

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      task.status === 'running'
        ? 'border-blue-200 bg-blue-50/50'
        : task.status === 'completed'
          ? 'border-green-200 bg-green-50/30'
          : task.status === 'failed'
            ? 'border-red-200 bg-red-50/30'
            : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start gap-2.5">
        {/* Status indicator */}
        <div className={`mt-0.5 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
          {task.status === 'running' ? (
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className={`text-xs ${config.text}`}>{config.icon}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">#{task.sequence}</span>
            <span className={`text-sm font-medium ${config.text}`}>{task.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.text} ml-auto`}>
              {config.label}
            </span>
          </div>

          {/* Result */}
          {task.status === 'completed' && task.result && (
            <details className="mt-1.5">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                查看结果
              </summary>
              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-4">
                {task.result}
              </p>
            </details>
          )}

          {task.status === 'failed' && task.error_message && (
            <p className="text-xs text-red-500 mt-1">{task.error_message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
