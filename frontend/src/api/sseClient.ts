import type { TaskUpdateEvent } from '../types/task';

interface StreamHandlers {
  onTaskUpdate: (task: TaskUpdateEvent) => void;
  onMessageToken: (token: string) => void;
  onMessageComplete: (data: { message_id: string; content: string }) => void;
  onError?: (error: Event) => void;
}

export function createTaskStream(
  convId: string,
  msgId: string,
  handlers: StreamHandlers,
): () => void {
  const url = `/api/conversations/${convId}/messages/${msgId}/stream`;
  const source = new EventSource(url);

  source.addEventListener('task_update', (event) => {
    try {
      const data = JSON.parse(event.data) as TaskUpdateEvent;
      handlers.onTaskUpdate(data);
    } catch { /* ignore parse errors */ }
  });

  source.addEventListener('message_token', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.token) handlers.onMessageToken(data.token);
    } catch { /* ignore */ }
  });

  source.addEventListener('message_complete', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onMessageComplete(data);
    } catch { /* ignore */ }
    source.close();
  });

  source.onerror = (event) => {
    if (source.readyState === EventSource.CLOSED) {
      handlers.onError?.(event);
    }
  };

  return () => source.close();
}
