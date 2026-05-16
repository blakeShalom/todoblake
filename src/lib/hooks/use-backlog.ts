"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, collection, where, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/config";
import { scheduledQuery } from "@/lib/firebase/firestore";
import { TodoItem } from "@/lib/types";

function backlogPriorityBucket(item: TodoItem) {
  if (item.completed) return 2;
  if (item.recurrence) return 0;
  return 1;
}

function backlogRank(item: TodoItem) {
  if (typeof item.priorityOrder === "number") return item.priorityOrder;
  return 500000 + backlogPriorityBucket(item) * 500000 + item.sortOrder;
}

function compareBacklogItems(a: TodoItem, b: TodoItem) {
  const bucketDiff = Number(a.completed) - Number(b.completed);
  if (bucketDiff !== 0) return bucketDiff;
  const sortDiff = backlogRank(a) - backlogRank(b);
  if (sortDiff !== 0) return sortDiff;
  return a.title.localeCompare(b.title);
}

export function useBacklog() {
  const { user } = useAuth();
  const [unscheduledItems, setUnscheduledItems] = useState<TodoItem[]>([]);
  const [dueItems, setDueItems] = useState<TodoItem[]>([]);
  const [scheduled, setScheduled] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    const col = collection(db, "users", user.uid, "todoItems");

    // Items with no scheduled date (immediately visible)
    const unscheduledQ = query(
      col,
      where("slot", "==", "backlog"),
      where("scheduledDate", "==", null),
      orderBy("completed", "asc"),
      orderBy("sortOrder", "asc")
    );

    const unsub1 = onSnapshot(unscheduledQ, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setUnscheduledItems(results);
      setLoading(false);
    });

    // Items with scheduledDate <= today (due now)
    const dueQ = query(
      col,
      where("slot", "==", "backlog"),
      where("scheduledDate", "<=", today),
      orderBy("scheduledDate", "asc"),
      orderBy("sortOrder", "asc")
    );

    const unsub2 = onSnapshot(dueQ, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setDueItems(results);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, today]);

  // Scheduled future items
  useEffect(() => {
    if (!user) return;

    const q = scheduledQuery(user.uid, today);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setScheduled(results);
    });

    return unsubscribe;
  }, [user, today]);

  // Merge unscheduled + due items, deduplicate
  const seen = new Set<string>();
  const items: TodoItem[] = [];
  for (const item of [...unscheduledItems, ...dueItems]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }

  return { items: items.sort(compareBacklogItems), scheduled, loading };
}
