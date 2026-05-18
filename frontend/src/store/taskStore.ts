import { create } from 'zustand';
import type { Task, TaskUpdateEvent } from '../types/task';

interface TaskStore {
  tasks: Record<string, Task[]>; // keyed by message_id
  currentMsgId: string | null;

  setCurrentMsgId: (msgId: string | null) => void;
  initTasks: (msgId: string, tasks: Task[]) => void;
  updateTask: (msgId: string, update: TaskUpdateEvent) => void;
  clearTasks: (msgId: string) => void;
  clearAll: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: {},
  currentMsgId: null,

  setCurrentMsgId: (msgId) => set({ currentMsgId: msgId }),

  initTasks: (msgId, tasks) =>
    set(state => ({ tasks: { ...state.tasks, [msgId]: tasks } })),

  updateTask: (msgId, update) =>
    set(state => {
      const existing = state.tasks[msgId] || [];
      const idx = existing.findIndex(t => t.id === update.task_id);
      let newTasks: Task[];
      if (idx >= 0) {
        newTasks = existing.map((t, i) =>
          i === idx ? {
            ...t,
            status: update.status as Task['status'],
            result: update.result ?? t.result,
            error_message: update.error_message ?? t.error_message,
            agent_id: update.agent_id ?? t.agent_id,
            agent_name: update.agent_name ?? (t as any).agent_name,
          } : t
        );
      } else {
        // New task (from decomposition)
        newTasks = [...existing, {
          id: update.task_id,
          message_id: msgId,
          conversation_id: '',
          agent_id: update.agent_id ?? '',
          sequence: update.sequence,
          name: update.name,
          status: update.status as Task['status'],
          result: update.result,
          error_message: update.error_message,
          created_at: new Date().toISOString(),
        }];
      }
      return { tasks: { ...state.tasks, [msgId]: newTasks } };
    }),

  clearTasks: (msgId) =>
    set(state => {
      const { [msgId]: _, ...rest } = state.tasks;
      return { tasks: rest };
    }),

  clearAll: () => set({ tasks: {}, currentMsgId: null }),
}));
