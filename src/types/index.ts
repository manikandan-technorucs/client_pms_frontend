// Shared TypeScript types for TechnoRUCS PMS

export type StatusValue = 'open' | 'in_progress' | 'resolved' | 'closed';

export const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

// ─── Attachment ─────────────────────────────────────────────────────────────
export interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  project_id: number | null;
  task_id: number | null;
  bug_id: number | null;
}

// ─── Project ─────────────────────────────────────────────────────────────────
export interface Project {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: StatusValue;
  attachments: Attachment[];
  // Audit fields (populated after backend migration)
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: StatusValue;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: StatusValue;
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export interface Task {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  assignees: string[];
  status: StatusValue;
  attachments: Attachment[];
  subtasks: Task[];
  // Audit fields
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface TaskCreate {
  project_id: number;
  parent_id?: number | null;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  assignees?: string[];
  status?: StatusValue;
}

export interface TaskUpdate {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  assignees?: string[];
  status?: StatusValue;
  parent_id?: number | null;
}

// ─── Bug ──────────────────────────────────────────────────────────────────────
export interface Bug {
  id: number;
  project_id: number;
  task_id: number | null;
  parent_id: number | null;
  title: string;
  description: string | null;
  reporter: string;
  assignees: string[];
  start_date: string | null;
  end_date: string | null;
  status: StatusValue;
  attachments: Attachment[];
  sub_bugs: Bug[];
  // Audit fields
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface BugCreate {
  project_id: number;
  task_id?: number | null;
  parent_id?: number | null;
  title: string;
  description?: string;
  reporter: string;
  assignees?: string[];
  start_date?: string;
  end_date?: string;
  status?: StatusValue;
}

export interface BugUpdate {
  title?: string;
  description?: string;
  reporter?: string;
  assignees?: string[];
  start_date?: string;
  end_date?: string;
  status?: StatusValue;
  task_id?: number | null;
  parent_id?: number | null;
}

// ─── Tree Node ────────────────────────────────────────────────────────────────
export interface TreeNodeData {
  key: string;
  data: Task | Bug;
  children?: TreeNodeData[];
}
