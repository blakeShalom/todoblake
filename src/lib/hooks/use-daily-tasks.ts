"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { dailyTasksQuery, dailyCompletionsQuery } from "@/lib/firebase/firestore";
import { DailyTask, DailyTaskCompletion } from "@/lib/types";
import { format } from "date-fns";

export function useDailyTasks(date?: Date) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [completions, setCompletions] = useState<DailyTaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(dailyTasksQuery(user.uid), (snapshot) => {
      const results: DailyTask[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyTask[];
      setTasks(results);
      setLoading(false);
    });

    const unsubCompletions = onSnapshot(
      dailyCompletionsQuery(user.uid, dateStr),
      (snapshot) => {
        const results: DailyTaskCompletion[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DailyTaskCompletion[];
        setCompletions(results);
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

  return { tasks, completions, loading, isCompleted, getCompletionId };
}
