import type { Message } from '../../types/message';

const AGENT_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#ca8a04', '#16a34a'];
let colorIndex = 0;
const agentColorCache = new Map<string, string>();

function getAgentColor(agentId: string): string {
  if (!agentColorCache.has(agentId)) {
    agentColorCache.set(agentId, AGENT_COLORS[colorIndex % AGENT_COLORS.length]);
    colorIndex++;
  }
  return agentColorCache.get(agentId)!;
}

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const agentName = message.agent_name;
  const agentColor = agentName ? getAgentColor(message.agent_id || agentName) : undefined;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-1'}`}>
        {!isUser && agentName && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
              style={{ backgroundColor: agentColor }}
            >
              {agentName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-medium text-gray-500">{agentName}</span>
          </div>
        )}
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
              : message.content
                ? 'bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-md'
                : 'bg-gray-100 border border-gray-200 text-gray-900 rounded-2xl rounded-bl-md'
          }`}
        >
          {message.content || (isUser ? '' : (
            <div className="flex gap-1 py-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ))}
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? '你' : (agentName || '智能体')}
        </p>
      </div>
    </div>
  );
}
