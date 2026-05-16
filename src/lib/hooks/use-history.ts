"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, collection, where, orderBy, Timestamp, getDocs } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/config";
import { TodoItem, DailyTaskCompletion, SyncState } from "@/lib/types";

export type TimeFilter = "24h" | "7d" | "30d" | "all";

export interface DailyCompletionWithTitle {
  id: string;
  taskTitle: string;
  date: string;
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
  const [loading, setLoading] = useState(true);
  const [itemSyncState, setItemSyncState] = useState<SyncState>(SYNCED);
  const [completionSyncState, setCompletionSyncState] = useState<SyncState>(SYNCED);

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

    const q = query(col, ...constraints);
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
    });

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

    const q = query(completionsCol, ...constraints);
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
      const completions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyTaskCompletion[];
      setCompletionSyncState({
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });

      const tasksCol = collection(db, "users", user.uid, "dailyTasks");
      const tasksSnap = await getDocs(tasksCol);
      const taskNames = new Map<string, string>();
      tasksSnap.docs.forEach((doc) => {
        taskNames.set(doc.id, doc.data().title);
      });

      const results: DailyCompletionWithTitle[] = completions.map((c) => ({
        id: c.id,
        taskTitle: taskNames.get(c.taskId) || "Unknown task",
        date: c.date,
        completedAt: c.completedAt,
      }));

      setDailyCompletions(results);
    });

    return unsubscribe;
  }, [user, filter]);

  const syncState: SyncState = {
    fromCache: itemSyncState.fromCache || completionSyncState.fromCache,
    hasPendingWrites:
      itemSyncState.hasPendingWrites || completionSyncState.hasPendingWrites,
  };

  return { items, dailyCompletions, loading, syncState };
}
