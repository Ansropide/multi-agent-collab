import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelConfigStore } from '../store/modelConfigStore';
import type { ModelConfig } from '../types/modelConfig';

export default function Settings() {
  const navigate = useNavigate();
  const { configs, loading, fetchConfigs, createConfig, updateConfig, deleteConfig } = useModelConfigStore();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setBaseUrl('');
    setApiKey('');
    setModel('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (config: ModelConfig) => {
    setEditing(config);
    setName(config.name);
    setBaseUrl(config.llm_base_url);
    setApiKey(config.llm_api_key);
    setModel(config.llm_model);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('请输入配置名称'); return; }
    if (!baseUrl.trim()) { setError('请输入 LLM API 地址'); return; }
    if (!apiKey.trim()) { setError('请输入 API Key'); return; }

    setSubmitting(true);
    try {
      if (editing) {
        await updateConfig(editing.id, {
          name: name.trim(),
          llm_base_url: baseUrl.trim(),
          llm_api_key: apiKey.trim(),
          llm_model: model.trim() || undefined,
        });
      } else {
        await createConfig({
          name: name.trim(),
          llm_base_url: baseUrl.trim(),
          llm_api_key: apiKey.trim(),
          llm_model: model.trim() || undefined,
        });
      }
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (config: ModelConfig) => {
    if (!confirm(`确定要删除模型配置「${config.name}」吗？`)) return;
    try {
      await deleteConfig(config.id);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">模型配置管理</h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建配置
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">还没有模型配置</h3>
            <p className="text-gray-500 mb-6">预先设置模型配置，创建智能体时一键选择</p>
            <button
              onClick={openCreate}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              新建配置
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map(config => (
              <div key={config.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base">{config.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-16 shrink-0">API 地址</span>
                        <code className="text-xs bg-gray-50 px-2 py-0.5 rounded truncate">{config.llm_base_url}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-16 shrink-0">模型</span>
                        <span>{config.llm_model}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-16 shrink-0">API Key</span>
                        <span className="text-gray-300">••••••{config.llm_api_key.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => openEdit(config)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(config)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {editing ? '编辑模型配置' : '新建模型配置'}
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  配置名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：OpenAI GPT-4、DeepSeek"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              {/* LLM Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  LLM API 地址 <span className="text-red-500">*</span>
                </label>
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
                <input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="gpt-4 / deepseek-chat / qwen-plus"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '保存中...' : editing ? '保存修改' : '创建配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
