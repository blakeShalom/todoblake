import { Timestamp } from "firebase/firestore";

export type SlotType = "essential" | "priority" | "outcome" | "backlog";

export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "semiannually" | "yearly";

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  slot: SlotType;
  assignedDate: string | null;
  scheduledDate: string | null;
  deadline: string | null;
  completed: boolean;
  completedAt: Timestamp | null;
  sortOrder: number;
  recurrence: RecurrenceFrequency | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyTaskCompletion {
  id: string;
  taskId: string;
  date: string;
  completedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

export const SLOT_LIMITS: Record<Exclude<SlotType, "backlog">, number> = {
  essential: 1,
  priority: 2,
  outcome: 3,
};
