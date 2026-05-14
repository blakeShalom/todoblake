"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, collection, where, orderBy, Timestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/config";
import { TodoItem } from "@/lib/types";

export type TimeFilter = "24h" | "7d" | "30d" | "all";

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
  const [loading, setLoading] = useState(true);

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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setItems(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, filter]);

  return { items, loading };
}
