-- Tasks & goals (aligned with frontend src/types/database.ts)

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(64) NOT NULL DEFAULT 'other',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  target_date TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal_id UUID NULL REFERENCES goals (id) ON DELETE SET NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mode VARCHAR(32) NOT NULL DEFAULT 'human_in_loop',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  progress INT NOT NULL DEFAULT 0,
  current_step INT NOT NULL DEFAULT 0,
  total_steps INT NOT NULL DEFAULT 0,
  result JSONB NULL,
  error TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  deadline TIMESTAMPTZ NULL,
  CONSTRAINT tasks_mode_check CHECK (mode IN ('autonomous', 'human_in_loop')),
  CONSTRAINT tasks_status_check CHECK (
    status IN ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks (goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks (user_id, created_at DESC);
