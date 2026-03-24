export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: string
          status: 'active' | 'completed' | 'archived'
          target_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          category?: string
          status?: 'active' | 'completed' | 'archived'
          target_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          category?: string
          status?: 'active' | 'completed' | 'archived'
          target_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          category: string
          title: string
          description: string
          mode: 'autonomous' | 'human_in_loop'
          status: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          progress: number
          current_step: number
          total_steps: number
          result: Json | null
          error: string | null
          metadata: Json
          created_at: string
          updated_at: string
          started_at: string | null
          completed_at: string | null
          deadline: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          category?: string
          title: string
          description?: string
          mode?: 'autonomous' | 'human_in_loop'
          status?: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          progress?: number
          current_step?: number
          total_steps?: number
          result?: Json | null
          error?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
          deadline?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          category?: string
          title?: string
          description?: string
          mode?: 'autonomous' | 'human_in_loop'
          status?: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          progress?: number
          current_step?: number
          total_steps?: number
          result?: Json | null
          error?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
          deadline?: string | null
        }
      }
      task_steps: {
        Row: {
          id: string
          task_id: string
          step_number: number
          name: string
          description: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          type: 'analysis' | 'execution' | 'decision' | 'approval_required'
          input: Json
          output: Json
          logs: string[]
          duration_ms: number | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          step_number: number
          name: string
          description?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          type?: 'analysis' | 'execution' | 'decision' | 'approval_required'
          input?: Json
          output?: Json
          logs?: string[]
          duration_ms?: number | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          step_number?: number
          name?: string
          description?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
          type?: 'analysis' | 'execution' | 'decision' | 'approval_required'
          input?: Json
          output?: Json
          logs?: string[]
          duration_ms?: number | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      task_approvals: {
        Row: {
          id: string
          task_id: string
          step_id: string | null
          user_id: string
          title: string
          message: string
          options: Json
          status: 'pending' | 'approved' | 'rejected' | 'modified'
          selected_option: Json | null
          user_feedback: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          step_id?: string | null
          user_id: string
          title: string
          message: string
          options?: Json
          status?: 'pending' | 'approved' | 'rejected' | 'modified'
          selected_option?: Json | null
          user_feedback?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          step_id?: string | null
          user_id?: string
          title?: string
          message?: string
          options?: Json
          status?: 'pending' | 'approved' | 'rejected' | 'modified'
          selected_option?: Json | null
          user_feedback?: string | null
          created_at?: string
          responded_at?: string | null
        }
      }
      task_files: {
        Row: {
          id: string
          task_id: string
          step_id: string | null
          user_id: string
          name: string
          type: string
          size: number
          url: string | null
          storage_path: string | null
          extracted_content: string | null
          metadata: Json
          is_output: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          step_id?: string | null
          user_id: string
          name: string
          type: string
          size: number
          url?: string | null
          storage_path?: string | null
          extracted_content?: string | null
          metadata?: Json
          is_output?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          step_id?: string | null
          user_id?: string
          name?: string
          type?: string
          size?: number
          url?: string | null
          storage_path?: string | null
          extracted_content?: string | null
          metadata?: Json
          is_output?: boolean
          created_at?: string
        }
      }
    }
  }
}
