import { create } from 'zustand';
import type { Agent, CreateAgentDTO } from '../types/agent';
import { agentApi } from '../api/agentApi';

interface AgentStore {
  agents: Agent[];
  currentAgent: Agent | null;
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  fetchAgent: (id: string) => Promise<void>;
  createAgent: (data: CreateAgentDTO) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  currentAgent: null,
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const { items } = await agentApi.list();
      set({ agents: items, loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.detail || '获取智能体列表失败', loading: false });
    }
  },

  fetchAgent: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const agent = await agentApi.get(id);
      set({ currentAgent: agent, loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.detail || '获取智能体信息失败', loading: false });
    }
  },

  createAgent: async (data: CreateAgentDTO) => {
    const agent = await agentApi.create(data);
    set(state => ({ agents: [agent, ...state.agents] }));
    return agent;
  },

  deleteAgent: async (id: string) => {
    await agentApi.delete(id);
    set(state => ({ agents: state.agents.filter(a => a.id !== id) }));
  },
}));
