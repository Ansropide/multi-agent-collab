export interface Task {
  id: string;
  message_id: string;
  conversation_id: string;
  agent_id: string;
  sequence: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  agent_name?: string | null;
}

export interface TaskUpdateEvent {
  task_id: string;
  sequence: number;
  name: string;
  status: string;
  result?: string | null;
  error_message?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
}
