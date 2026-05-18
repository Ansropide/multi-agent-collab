import { create } from 'zustand';
import type { Conversation } from '../types/conversation';
import type { Message } from '../types/message';
import { conversationApi, messageApi } from '../api/conversationApi';

interface ChatStore {
  conversations: Conversation[];
  groupConversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  sending: boolean;
  activeMsgId: string | null;
  error: string | null;

  fetchConversations: (agentId: string) => Promise<void>;
  fetchAllConversations: () => Promise<void>;
  fetchGroupConversations: () => Promise<void>;
  createConversation: (agentId: string) => Promise<Conversation>;
  createGroupConversation: (agentIds: string[], title?: string) => Promise<Conversation>;
  selectConversation: (conv: Conversation) => Promise<void>;
  deleteConversation: (convId: string) => Promise<void>;
  archiveConversation: (convId: string) => Promise<void>;
  fetchMessages: (convId: string) => Promise<void>;
  sendMessage: (convId: string, content: string) => Promise<string | null>;
  appendAssistantMessage: (content: string) => void;
  appendToken: (token: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  groupConversations: [],
  currentConversation: null,
  messages: [],
  sending: false,
  activeMsgId: null,
  error: null,

  fetchConversations: async (agentId: string) => {
    try {
      const { items } = await conversationApi.list(agentId, 'active');
      set({ conversations: items });
    } catch { /* ignore */ }
  },

  fetchAllConversations: async () => {
    try {
      const { items } = await conversationApi.listAll('active');
      set({ conversations: items });
    } catch { /* ignore */ }
  },

  fetchGroupConversations: async () => {
    try {
      const { items } = await conversationApi.listAll('active');
      const groups = items.filter(c => (c.agents?.length ?? 0) > 1);
      set({ groupConversations: groups });
    } catch { /* ignore */ }
  },

  createConversation: async (agentId: string) => {
    const conv = await conversationApi.create(agentId);
    set(state => ({ conversations: [conv, ...state.conversations], currentConversation: conv, messages: [] }));
    return conv;
  },

  createGroupConversation: async (agentIds: string[], title?: string) => {
    const conv = await conversationApi.createGroup(agentIds, title);
    set(state => ({ conversations: [conv, ...state.conversations], currentConversation: conv, messages: [] }));
    return conv;
  },

  selectConversation: async (conv: Conversation) => {
    set({ currentConversation: conv, messages: [] });
    const { items } = await messageApi.list(conv.id);
    set({ messages: items });
  },

  deleteConversation: async (convId: string) => {
    await conversationApi.delete(convId);
    const state = get();
    const remaining = state.conversations.filter(c => c.id !== convId);
    const nextConv = remaining.length > 0 ? remaining[0] : null;
    set({
      conversations: remaining,
      currentConversation: nextConv,
      messages: nextConv ? [] : [],
    });
    if (nextConv) {
      const { items } = await messageApi.list(nextConv.id);
      set({ messages: items });
    }
  },

  archiveConversation: async (convId: string) => {
    const archived = await conversationApi.archive(convId);
    const state = get();
    const remaining = state.conversations.filter(c => c.id !== convId);
    const wasCurrent = state.currentConversation?.id === convId;
    const nextConv = wasCurrent ? (remaining.length > 0 ? remaining[0] : null) : state.currentConversation;
    set({
      conversations: remaining,
      currentConversation: nextConv,
      messages: nextConv ? [] : [],
    });
    if (nextConv && wasCurrent) {
      const { items } = await messageApi.list(nextConv.id);
      set({ messages: items });
    }
  },

  fetchMessages: async (convId: string) => {
    try {
      const { items } = await messageApi.list(convId);
      set({ messages: items });
    } catch { /* ignore */ }
  },

  sendMessage: async (convId: string, content: string) => {
    set({ sending: true, error: null });
    try {
      // Add user message optimistically
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      set(state => ({ messages: [...state.messages, tempUserMsg] }));

      const { message_id } = await messageApi.send(convId, content);
      set({ activeMsgId: message_id });

      // Add assistant placeholder
      const tempAssistantMsg: Message = {
        id: message_id,
        conversation_id: convId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };
      set(state => ({ messages: [...state.messages, tempAssistantMsg] }));

      return message_id;
    } catch (e: any) {
      set({ error: e?.response?.data?.detail || '发送消息失败', sending: false });
      return null;
    }
  },

  appendAssistantMessage: (content: string) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === state.activeMsgId ? { ...m, content } : m
      ),
      sending: false,
      activeMsgId: null,
    }));
  },

  appendToken: (token: string) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === state.activeMsgId ? { ...m, content: m.content + token } : m
      ),
    }));
  },
}));
