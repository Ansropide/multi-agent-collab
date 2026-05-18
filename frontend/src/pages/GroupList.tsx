import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';

const AGENT_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#ca8a04', '#16a34a'];

export default function GroupList() {
  const navigate = useNavigate();
  const { groupConversations, fetchGroupConversations } = useChatStore();

  useEffect(() => {
    fetchGroupConversations();
  }, [fetchGroupConversations]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">群聊管理</h1>
          </div>
          <button
            onClick={() => navigate('/groups/create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建群聊
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {groupConversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">还没有任何群聊</h3>
            <p className="text-gray-500 mb-6">创建一个群聊，让多个智能体协同工作</p>
            <button
              onClick={() => navigate('/groups/create')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              立即创建
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupConversations.map(conv => (
              <div
                key={conv.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{conv.title || '群聊'}</h3>
                    <p className="text-xs text-gray-400">
                      {conv.agents?.length || 0} 个成员 · {new Date(conv.updated_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>

                {/* Agent list */}
                <div className="space-y-1.5 mb-4">
                  {conv.agents?.map((agent, idx) => (
                    <div key={agent.id} className="flex items-center gap-2.5 px-2 py-1.5 bg-gray-50 rounded-lg">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: AGENT_COLORS[idx % AGENT_COLORS.length] }}
                      >
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 truncate flex-1">{agent.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: agent.role === 'planner' ? '#eef2ff' : '#f0fdf4',
                          color: agent.role === 'planner' ? '#4f46e5' : '#16a34a',
                        }}
                      >
                        {agent.role === 'planner' ? '规划器' : '执行器'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action */}
                <button
                  onClick={() => navigate(`/agents/${conv.agent_id}/workspace`)}
                  className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  进入工作区
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
