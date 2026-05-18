import { useTaskStore } from '../../store/taskStore';
import { useChatStore } from '../../store/chatStore';
import TaskItem from './TaskItem';
import GroupWorkflowPanel from '../group/GroupWorkflowPanel';

export default function TaskPanel() {
  const { tasks, currentMsgId } = useTaskStore();
  const currentConversation = useChatStore(s => s.currentConversation);
  const currentTasks = currentMsgId ? tasks[currentMsgId] || [] : [];

  const agents = currentConversation?.agents || [];
  const isGroup = agents.length > 1;

  if (isGroup) {
    return <GroupWorkflowPanel agents={agents} tasks={currentTasks} />;
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h2 className="font-medium text-gray-700 text-sm">任务进度</h2>
          {currentTasks.length > 0 && (
            <span className="text-xs text-gray-400 ml-auto">
              {currentTasks.filter(t => t.status === 'completed').length}/{currentTasks.length}
            </span>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {currentTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 text-xs">发送消息后将在此显示任务进度</p>
          </div>
        ) : (
          currentTasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>
    </>
  );
}
