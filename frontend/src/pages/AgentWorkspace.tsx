import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgentStore } from '../store/agentStore';
import { useChatStore } from '../store/chatStore';
import { useTaskStore } from '../store/taskStore';
import { createTaskStream } from '../api/sseClient';
import ChatPanel from '../features/chat/ChatPanel';
import TaskPanel from '../features/tasks/TaskPanel';
import ConversationSidebar from '../features/conversations/ConversationSidebar';

const AGENT_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#ca8a04', '#16a34a'];

export default function AgentWorkspace() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { currentAgent, fetchAgent, loading: agentLoading } = useAgentStore();
  const {
    conversations, currentConversation, messages, sending, activeMsgId,
    fetchConversations, createConversation,
    selectConversation, deleteConversation,
    sendMessage, appendAssistantMessage, appendToken,
  } = useChatStore();
  const { updateTask, setCurrentMsgId } = useTaskStore();
  const convInitializedRef = useRef(false);

  useEffect(() => {
    if (agentId) {
      fetchAgent(agentId);
      fetchConversations(agentId);
    }
  }, [agentId, fetchAgent, fetchConversations]);

  useEffect(() => {
    if (!convInitializedRef.current && !agentLoading && agentId) {
      const { conversations } = useChatStore.getState();
      if (conversations.length > 0) {
        selectConversation(conversations[0]);
      }
      convInitializedRef.current = true;
    }
  }, [agentId, agentLoading, selectConversation]);

  useEffect(() => {
    if (!activeMsgId || !currentConversation) return;

    setCurrentMsgId(activeMsgId);
    const cleanup = createTaskStream(
      currentConversation.id,
      activeMsgId,
      {
        onTaskUpdate: (task) => updateTask(activeMsgId, task),
        onMessageToken: (token) => appendToken(token),
        onMessageComplete: (data) => {
          appendAssistantMessage(data.content);
        },
        onError: () => {},
      },
    );

    return cleanup;
  }, [activeMsgId, currentConversation, updateTask, appendToken, appendAssistantMessage, setCurrentMsgId]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentConversation) return;
    await sendMessage(currentConversation.id, content);
  }, [currentConversation, sendMessage]);

  const handleCreateConversation = useCallback(async () => {
    if (!agentId) return;
    try {
      await createConversation(agentId);
    } catch (e: any) {
      console.error('创建会话失败', e);
    }
  }, [agentId, createConversation]);

  const handleDeleteConversation = useCallback(async (convId: string) => {
    if (!confirm('确定要删除此会话吗？此操作不可恢复。')) return;
    try {
      await deleteConversation(convId);
    } catch (e: any) {
      console.error('删除会话失败', e);
    }
  }, [deleteConversation]);

  const isGroup = (currentConversation?.agents?.length ?? 0) > 1;

  if (agentLoading || !currentAgent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/agents')} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {isGroup && currentConversation?.agents ? (
          // Multi-agent header
          <div className="flex items-center gap-2">
            {currentConversation.agents.map((agent, idx) => (
              <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: AGENT_COLORS[idx % AGENT_COLORS.length] }}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-gray-700">{agent.name}</span>
              </div>
            ))}
          </div>
        ) : (
          // Single agent header
          <>
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">{currentAgent.name}</h1>
              <p className="text-xs text-gray-400">{currentAgent.llm_model}</p>
            </div>
          </>
        )}

        <div className="ml-auto text-xs text-gray-400">
          {currentConversation?.title}
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversation?.id ?? null}
          loading={false}
          onSelect={selectConversation}
          onCreate={handleCreateConversation}
          onDelete={handleDeleteConversation}
          agentName={currentAgent.name}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel messages={messages} sending={sending} onSend={handleSendMessage} />
        </div>
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
          <TaskPanel />
        </div>
      </div>
    </div>
  );
}
