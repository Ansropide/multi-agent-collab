import axios from 'axios';
import type { Conversation, ConversationListResponse, AgentInfo } from '../types/conversation';
import type { Message, MessageListResponse, MessageAcceptResponse } from '../types/message';

const http = axios.create({ baseURL: '/api' });

export const conversationApi = {
  create: (agentId: string, title?: string) =>
    http.post<Conversation>(`/agents/${agentId}/conversations`, { title }).then(r => r.data),

  createGroup: (agentIds: string[], title?: string) =>
    http.post<Conversation>('/conversations', { agent_ids: agentIds, title }).then(r => r.data),

  list: (agentId: string, status?: string) =>
    http.get<ConversationListResponse>(`/agents/${agentId}/conversations`, { params: { status } }).then(r => r.data),

  listAll: (status?: string) =>
    http.get<ConversationListResponse>('/conversations', { params: { status } }).then(r => r.data),

  get: (convId: string) =>
    http.get<Conversation>(`/conversations/${convId}`).then(r => r.data),

  archive: (convId: string) =>
    http.patch<Conversation>(`/conversations/${convId}`, { status: 'archived' }).then(r => r.data),

  delete: (convId: string) =>
    http.delete(`/conversations/${convId}`),

  // Agent management within conversations
  addAgent: (convId: string, agentId: string) =>
    http.post(`/conversations/${convId}/agents`, { agent_id: agentId }),

  removeAgent: (convId: string, agentId: string) =>
    http.delete(`/conversations/${convId}/agents/${agentId}`),

  listAgents: (convId: string) =>
    http.get<AgentInfo[]>(`/conversations/${convId}/agents`).then(r => r.data),
};

export const messageApi = {
  list: (convId: string) =>
    http.get<MessageListResponse>(`/conversations/${convId}/messages`).then(r => r.data),

  send: (convId: string, content: string) =>
    http.post<MessageAcceptResponse>(`/conversations/${convId}/messages`, { content }).then(r => r.data),

  getTasks: (convId: string, msgId: string) =>
    http.get(`/conversations/${convId}/messages/${msgId}/tasks`).then(r => r.data),
};
