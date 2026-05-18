import { useNavigate } from 'react-router-dom';
import type { Conversation } from '../../types/conversation';

interface Props {
  conversations: Conversation[];
  currentId: string | null;
  loading: boolean;
  onSelect: (conv: Conversation) => void;
  onCreate: () => void;
  onDelete: (convId: string) => void;
  agentName: string;
}

export default function ConversationSidebar({
  conversations, currentId, loading, onSelect, onCreate, onDelete, agentName,
}: Props) {
  const navigate = useNavigate();

  // Detect group conversations (has agents array with length > 1)
  const isGroupConv = (conv: Conversation) => (conv.agents?.length ?? 0) > 1;

  return (
    <>
      <div className="w-60 border-r border-gray-200 bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="px-3 py-3 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">会话历史</h2>
        </div>

        {/* New conversation buttons */}
        <div className="px-2 pt-2 space-y-1">
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建会话
          </button>
          <button
            onClick={() => navigate('/groups/create')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            新建群聊
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">暂无会话</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  conv.id === currentId
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => onSelect(conv)}
              >
                {isGroupConv(conv) ? (
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                )}
                <span className="truncate flex-1 text-xs">
                  {conv.title || agentName}
                </span>
                {isGroupConv(conv) && (
                  <span className="text-[9px] px-1 py-0.5 bg-indigo-50 text-indigo-500 rounded shrink-0">
                    群
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  title="删除会话"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </>
  );
}
