"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { dailyTasksQuery, dailyCompletionsQuery } from "@/lib/firebase/firestore";
import { DailyTask, DailyTaskCompletion, SyncState } from "@/lib/types";
import { format } from "date-fns";

const SYNCED: SyncState = { fromCache: false, hasPendingWrites: false };

export function useDailyTasks(date?: Date) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [completions, setCompletions] = useState<DailyTaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskSyncState, setTaskSyncState] = useState<SyncState>(SYNCED);
  const [completionSyncState, setCompletionSyncState] = useState<SyncState>(SYNCED);

  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(dailyTasksQuery(user.uid), { includeMetadataChanges: true }, (snapshot) => {
      const results: DailyTask[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyTask[];
      setTasks(results);
      setTaskSyncState({
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
      setLoading(false);
    });

    const unsubCompletions = onSnapshot(
      dailyCompletionsQuery(user.uid, dateStr),
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: DailyTaskCompletion[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DailyTaskCompletion[];
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
  }, [user, dateStr]);

  const isCompleted = (taskId: string) =>
    completions.some((c) => c.taskId === taskId);

  const getCompletionId = (taskId: string) =>
    completions.find((c) => c.taskId === taskId)?.id || null;

  const syncState: SyncState = {
    fromCache: taskSyncState.fromCache || completionSyncState.fromCache,
    hasPendingWrites:
      taskSyncState.hasPendingWrites || completionSyncState.hasPendingWrites,
  };

  return { tasks, completions, loading, syncState, isCompleted, getCompletionId };
}
