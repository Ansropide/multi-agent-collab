import axios from 'axios';
import type { ModelConfig, CreateModelConfigDTO, UpdateModelConfigDTO } from '../types/modelConfig';

const http = axios.create({ baseURL: '/api' });

export const modelConfigApi = {
  list: async (): Promise<ModelConfig[]> => {
    const { data } = await http.get('/model-configs');
    return data;
  },
  get: async (id: string): Promise<ModelConfig> => {
    const { data } = await http.get(`/model-configs/${id}`);
    return data;
  },
  create: async (dto: CreateModelConfigDTO): Promise<ModelConfig> => {
    const { data } = await http.post('/model-configs', dto);
    return data;
  },
  update: async (id: string, dto: UpdateModelConfigDTO): Promise<ModelConfig> => {
    const { data } = await http.put(`/model-configs/${id}`, dto);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await http.delete(`/model-configs/${id}`);
  },
};
