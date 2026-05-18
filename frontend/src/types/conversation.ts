export interface AgentInfo {
  id: string;
  name: string;
  llm_model: string;
  role?: string | null;
}

export interface Conversation {
  id: string;
  agent_id?: string | null;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  agents?: AgentInfo[];
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
}
