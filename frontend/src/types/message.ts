export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  agent_id?: string | null;
  agent_name?: string | null;
  created_at: string;
}

export interface MessageListResponse {
  items: Message[];
  total: number;
}

export interface MessageAcceptResponse {
  message_id: string;
  conversation_id: string;
}
