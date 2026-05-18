import { create } from 'zustand';
import type { ModelConfig, CreateModelConfigDTO, UpdateModelConfigDTO } from '../types/modelConfig';
import { modelConfigApi } from '../api/modelConfigApi';

interface ModelConfigStore {
  configs: ModelConfig[];
  loading: boolean;
  error: string | null;
  fetchConfigs: () => Promise<void>;
  createConfig: (data: CreateModelConfigDTO) => Promise<ModelConfig>;
  updateConfig: (id: string, data: UpdateModelConfigDTO) => Promise<ModelConfig>;
  deleteConfig: (id: string) => Promise<void>;
}

export const useModelConfigStore = create<ModelConfigStore>((set, get) => ({
  configs: [],
  loading: false,
  error: null,

  fetchConfigs: async () => {
    set({ loading: true, error: null });
    try {
      const configs = await modelConfigApi.list();
      set({ configs, loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.detail || '获取模型配置失败', loading: false });
    }
  },

  createConfig: async (data: CreateModelConfigDTO) => {
    const config = await modelConfigApi.create(data);
    set(state => ({ configs: [config, ...state.configs] }));
    return config;
  },

  updateConfig: async (id: string, data: UpdateModelConfigDTO) => {
    const config = await modelConfigApi.update(id, data);
    set(state => ({
      configs: state.configs.map(c => (c.id === id ? config : c)),
    }));
    return config;
  },

  deleteConfig: async (id: string) => {
    await modelConfigApi.delete(id);
    set(state => ({ configs: state.configs.filter(c => c.id !== id) }));
  },
}));
