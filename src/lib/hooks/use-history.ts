"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/config";
import {
  DailyTaskCompletion,
  SyncState,
  TodoItem,
  WeeklyTaskCompletion,
} from "@/lib/types";

export type TimeFilter = "24h" | "7d" | "30d" | "all";

export interface DailyCompletionWithTitle {
  id: string;
  taskTitle: string;
  date: string;
  completedAt: Timestamp;
}

export interface WeeklyCompletionWithTitle {
  id: string;
  taskTitle: string;
  weekStart: string;
  completedAt: Timestamp;
}

const SYNCED: SyncState = { fromCache: false, hasPendingWrites: false };

function getStartTimestamp(filter: TimeFilter): Timestamp | null {
  if (filter === "all") return null;
  const now = new Date();
  if (filter === "24h") now.setHours(now.getHours() - 24);
  else if (filter === "7d") now.setDate(now.getDate() - 7);
  else if (filter === "30d") now.setDate(now.getDate() - 30);
  return Timestamp.fromDate(now);
}

export function useHistory(filter: TimeFilter) {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletionWithTitle[]>([]);
  const [weeklyCompletions, setWeeklyCompletions] = useState<WeeklyCompletionWithTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSyncState, setItemSyncState] = useState<SyncState>(SYNCED);
  const [completionSyncState, setCompletionSyncState] = useState<SyncState>(SYNCED);
  const [weeklyCompletionSyncState, setWeeklyCompletionSyncState] =
    useState<SyncState>(SYNCED);

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    const col = collection(db, "users", user.uid, "todoItems");
    const startTs = getStartTimestamp(filter);
    const constraints = [
      where("completed", "==", true),
      ...(startTs ? [where("completedAt", ">=", startTs)] : []),
      orderBy("completedAt", "desc"),
    ];

    const unsubscribe = onSnapshot(
      query(col, ...constraints),
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: TodoItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TodoItem[];
        setItems(results);
        setItemSyncState({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, filter]);

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    const completionsCol = collection(db, "users", user.uid, "dailyTaskCompletions");
    const startTs = getStartTimestamp(filter);
    const constraints = [
      ...(startTs ? [where("completedAt", ">=", startTs)] : []),
      orderBy("completedAt", "desc"),
    ];

    const unsubscribe = onSnapshot(
      query(completionsCol, ...constraints),
      { includeMetadataChanges: true },
      async (snapshot) => {
        const completions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DailyTaskCompletion[];
        setCompletionSyncState({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        });

        const tasksSnap = await getDocs(collection(db, "users", user.uid, "dailyTasks"));
        const taskNames = new Map<string, string>();
        tasksSnap.docs.forEach((doc) => taskNames.set(doc.id, doc.data().title));

        setDailyCompletions(
          completions.map((completion) => ({
            id: completion.id,
            taskTitle: taskNames.get(completion.taskId) || "Unknown task",
            date: completion.date,
            completedAt: completion.completedAt,
          }))
        );
      }
    );

    return unsubscribe;
  }, [user, filter]);

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    const completionsCol = collection(db, "users", user.uid, "weeklyTaskCompletions");
    const startTs = getStartTimestamp(filter);
    const constraints = [
      ...(startTs ? [where("completedAt", ">=", startTs)] : []),
      orderBy("completedAt", "desc"),
    ];

    const unsubscribe = onSnapshot(
      query(completionsCol, ...constraints),
      { includeMetadataChanges: true },
      async (snapshot) => {
        const completions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WeeklyTaskCompletion[];
        setWeeklyCompletionSyncState({
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        });

        const tasksSnap = await getDocs(collection(db, "users", user.uid, "weeklyTasks"));
        const taskNames = new Map<string, string>();
        tasksSnap.docs.forEach((doc) => taskNames.set(doc.id, doc.data().title));

        setWeeklyCompletions(
          completions.map((completion) => ({
            id: completion.id,
            taskTitle: taskNames.get(completion.taskId) || "Unknown task",
            weekStart: completion.weekStart,
            completedAt: completion.completedAt,
          }))
        );
      }
    );

    return unsubscribe;
  }, [user, filter]);

  const syncState: SyncState = {
    fromCache:
      itemSyncState.fromCache ||
      completionSyncState.fromCache ||
      weeklyCompletionSyncState.fromCache,
    hasPendingWrites:
      itemSyncState.hasPendingWrites ||
      completionSyncState.hasPendingWrites ||
      weeklyCompletionSyncState.hasPendingWrites,
  };

  return { items, dailyCompletions, weeklyCompletions, loading, syncState };
}
