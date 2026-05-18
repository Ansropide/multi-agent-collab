import axios from 'axios';
import type { Agent, CreateAgentDTO, AgentListResponse } from '../types/agent';

const http = axios.create({ baseURL: '/api' });

export const agentApi = {
  list: (page = 1) =>
    http.get<AgentListResponse>('/agents', { params: { page } }).then(r => r.data),

  get: (id: string) =>
    http.get<Agent>(`/agents/${id}`).then(r => r.data),

  create: (data: CreateAgentDTO) =>
    http.post<Agent>('/agents', data).then(r => r.data),

  update: (id: string, data: Partial<CreateAgentDTO>) =>
    http.put<Agent>(`/agents/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    http.delete(`/agents/${id}`),
};
