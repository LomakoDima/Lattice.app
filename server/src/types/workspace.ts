export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'archived';
  target_date: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TaskRow = {
  id: string;
  user_id: string;
  goal_id: string | null;
  category: string;
  title: string;
  description: string;
  mode: 'autonomous' | 'human_in_loop';
  status:
    | 'pending'
    | 'running'
    | 'waiting_approval'
    | 'completed'
    | 'failed'
    | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  current_step: number;
  total_steps: number;
  result: unknown | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  deadline: Date | null;
};
