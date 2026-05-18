import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../store/agentStore';
import { useChatStore } from '../store/chatStore';

export default function GroupCreate() {
  const navigate = useNavigate();
  const { agents, fetchAgents } = useAgentStore();
  const { createGroupConversation } = useChatStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const toggleAgent = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length < 2) {
      setError('请至少选择 2 个智能体');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const conv = await createGroupConversation(selectedIds, groupTitle || undefined);
      navigate(`/agents/${conv.agent_id}/workspace`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '创建群聊失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/groups')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">新建群聊</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* Title input */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">群聊名称</label>
          <input
            type="text"
            placeholder="给群聊起个名字（可选）"
            value={groupTitle}
            onChange={e => setGroupTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Agent selection */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">选择智能体</label>
            <span className="text-xs text-gray-400">
              已选 {selectedIds.length} 个（至少 2 个，第一个为规划器）
            </span>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-3">暂无智能体，请先创建</p>
              <button
                onClick={() => navigate('/agents/create')}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                创建智能体
              </button>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {agents.map((agent, idx) => {
                const isFirstSelected = selectedIds.length > 0 && selectedIds[0] === agent.id;
                return (
                  <label
                    key={agent.id}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                      selectedIds.includes(agent.id)
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {agent.name}
                          {isFirstSelected && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">规划器</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{agent.llm_model}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate('/groups')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.length < 2}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                创建中...
              </>
            ) : (
              '创建群聊'
            )}
          </button>
        </div>

        {/* Order hint */}
        {selectedIds.length > 1 && (
          <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong>选择顺序决定角色：</strong>
            第一个选中的 Agent「{agents.find(a => a.id === selectedIds[0])?.name}」将作为规划器，负责分解任务和分配工作。
            其余 Agent 作为执行器，各自执行被分配的子任务。
          </div>
        )}
      </div>
    </div>
  );
}
