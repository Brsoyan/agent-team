// ── Task Board Types ──

export type AgentRole = 'manager' | 'pm' | 'critic' | 'designer' | 'developer' | 'gatekeeper' | 'reviewer' | 'qa';

export type TaskStatus =
  | 'backlog'
  | 'spec_review'      // Critic is reviewing PM's spec
  | 'spec_approved'     // Critic approved, ready for design
  | 'designing'         // Designer working on it
  | 'design_done'       // Design complete, ready for dev
  | 'todo'              // Ready for developer
  | 'in_progress'       // Developer working
  | 'code_review'       // Reviewer checking code
  | 'review_approved'   // Code approved, ready for QA
  | 'testing'           // QA testing
  | 'done'              // Complete
  | 'blocked';          // Blocked by something

export type TaskType = 'feature' | 'bug' | 'design' | 'unit_test' | 'ui_test' | 'fix';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Comment {
  id: string;
  author: AgentRole;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assignee: AgentRole;
  created_by: AgentRole;
  linked_files: string[];
  comments: Comment[];
  parent_task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BoardState {
  project_name: string;
  project_description: string;
  day: number;
  tasks: Task[];
}

// ── Agent Types ──

export interface AgentConfig {
  role: AgentRole;
  name: string;
  title: string;
  system_prompt: string;
  allowed_actions: string[];
}

export interface AgentAction {
  agent: AgentRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface DayLog {
  day: number;
  actions: AgentAction[];
  summary: string;
}

// ── Token Usage (captured from Claude Code stream-json `result` event) ──

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  total_cost_usd: number;
  duration_ms: number;
  model?: string;
}

export interface UsageEntry extends TokenUsage {
  project_id: string;
  day: number;
  role: AgentRole;
  name: string;
  task_id?: string;
  timestamp: string;
}

// ── Tool Types (Claude API tool_use) ──

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
