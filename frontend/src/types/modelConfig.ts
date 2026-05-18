export interface ModelConfig {
  id: string;
  name: string;
  llm_base_url: string;
  llm_api_key: string;
  llm_model: string;
  created_at: string;
  updated_at: string;
}

export interface CreateModelConfigDTO {
  name: string;
  llm_base_url: string;
  llm_api_key: string;
  llm_model?: string;
}

export interface UpdateModelConfigDTO {
  name?: string;
  llm_base_url?: string;
  llm_api_key?: string;
  llm_model?: string;
}
