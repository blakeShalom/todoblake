"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import {
  weeklyCompletionsQuery,
  weeklyTasksQuery,
} from "@/lib/firebase/firestore";
import { SyncState, WeeklyTask, WeeklyTaskCompletion } from "@/lib/types";
import { getWeekStart } from "@/lib/utils";

const SYNCED: SyncState = { fromCache: false, hasPendingWrites: false };

export function useWeeklyTasks(date?: Date) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [completions, setCompletions] = useState<WeeklyTaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskSyncState, setTaskSyncState] = useState<SyncState>(SYNCED);
  const [completionSyncState, setCompletionSyncState] = useState<SyncState>(SYNCED);

  const weekStart = getWeekStart(date || new Date());

  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(
      weeklyTasksQuery(user.uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: WeeklyTask[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WeeklyTask[];
        setTasks(results);
        setTaskSyncState({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        });
        setLoading(false);
      }
    );

    const unsubCompletions = onSnapshot(
      weeklyCompletionsQuery(user.uid, weekStart),
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: WeeklyTaskCompletion[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WeeklyTaskCompletion[];
        setCompletions(results);
        setCompletionSyncState({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        });
      }
    );

    return () => {
      unsubTasks();
      unsubCompletions();
    };
  }, [user, weekStart]);

  const isCompleted = (taskId: string) =>
    completions.some((completion) => completion.taskId === taskId);

  const getCompletionId = (taskId: string) =>
    completions.find((completion) => completion.taskId === taskId)?.id || null;

  const syncState: SyncState = {
    fromCache: taskSyncState.fromCache || completionSyncState.fromCache,
    hasPendingWrites:
      taskSyncState.hasPendingWrites || completionSyncState.hasPendingWrites,
  };

  return {
    tasks,
    completions,
    loading,
    weekStart,
    syncState,
    isCompleted,
    getCompletionId,
  };
}
