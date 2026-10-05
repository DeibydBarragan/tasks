export const PALETTE_12 = [
  "#F97316",
  "#2563EB",
  "#9333EA",
  "#16A34A",
  "#DB2777",
  "#0891B2",
  "#65A30D",
  "#64748B",
  "#EF4444",
  "#EAB308",
  "#0D9488",
  "#4F46E5",
] as const;

export type PriorityLevel = 1 | 2 | 3 | 4; // 1: Urgente, 2: Alta, 3: Media, 4: Baja

export type TaskStatus = "pending" | "completed";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type TaskList = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  created_at: string;
  task_count?: number;
};

export type Task = {
  id: string;
  user_id: string;
  list_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;      // "YYYY-MM-DD"
  due_time: string | null;      // "HH:mm"
  priority: PriorityLevel;
  is_urgent: boolean;
  is_important: boolean;
  status: TaskStatus;
  completed_at: string | null;  // ISO string
  next_task_id: string | null;
  chain_name: string | null;
  chain_time: string | null;
  checklist: ChecklistItem[];
  estimated_hours: number | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type TaskChain = {
  id: string;
  headId: string;
  name: string;
  time?: string | null;
  tasks: Task[];
};

export type Streak = {
  current: number;
  best: number;
  todayPending: boolean;
  todayCovered: boolean;
};

export type FocusSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  list_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
  created_at: string;
};

export type ActiveFocus = {
  session: FocusSession;
  task_title: string | null;
  list_color: string | null;
  list_name: string | null;
  elapsed_seconds: number;
};

export type SortOption = "due_date" | "priority" | "title" | "created_at" | "manual";
