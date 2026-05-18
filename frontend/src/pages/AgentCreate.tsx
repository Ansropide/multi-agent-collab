import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../store/agentStore';

export default function AgentCreate() {
  const navigate = useNavigate();
  const { createAgent } = useAgentStore();

  const [systemPrompt, setSystemPrompt] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!systemPrompt.trim()) { setError('请输入智能体提示词'); return; }
    if (!baseUrl.trim()) { setError('请输入 LLM API 地址'); return; }
    if (!apiKey.trim()) { setError('请输入 API Key'); return; }

    setSubmitting(true);
    try {
      const agent = await createAgent({
        system_prompt: systemPrompt.trim(),
        llm_base_url: baseUrl.trim(),
        llm_api_key: apiKey.trim(),
        llm_model: model.trim() || undefined,
      });
      navigate(`/agents/${agent.id}/workspace`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '创建失败，请检查配置');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">创建新智能体</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              智能体提示词 <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">描述这个智能体要做什么，越详细越好</p>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="例如：你是一个编程助手，帮助用户解决代码问题..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* LLM Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              LLM API 地址 <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">兼容 OpenAI 格式的 API 地址</p>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              模型名称 <span className="text-gray-400">(可选)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">例如：gpt-4、deepseek-chat、qwen-plus</p>
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="gpt-3.5-turbo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '创建中...' : '创建智能体'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
