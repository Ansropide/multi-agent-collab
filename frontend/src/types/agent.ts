export interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  llm_base_url: string;
  llm_api_key: string;
  llm_model: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentDTO {
  system_prompt: string;
  llm_base_url: string;
  llm_api_key: string;
  llm_model?: string;
}

export interface AgentListResponse {
  items: Agent[];
  total: number;
}
