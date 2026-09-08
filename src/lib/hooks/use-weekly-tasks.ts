"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import {
  weeklyCompletionsQuery,
  weeklyTasksQuery,
} from "@/lib/firebase/firestore";
import { WeeklyTask, WeeklyTaskCompletion } from "@/lib/types";
import { getWeekStart } from "@/lib/utils";

export function useWeeklyTasks(date?: Date) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [completions, setCompletions] = useState<WeeklyTaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart(date || new Date());

  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(weeklyTasksQuery(user.uid), (snapshot) => {
      const results: WeeklyTask[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WeeklyTask[];
      setTasks(results);
      setLoading(false);
    });

    const unsubCompletions = onSnapshot(
      weeklyCompletionsQuery(user.uid, weekStart),
      (snapshot) => {
        const results: WeeklyTaskCompletion[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WeeklyTaskCompletion[];
        setCompletions(results);
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

  return { tasks, completions, loading, weekStart, isCompleted, getCompletionId };
}
