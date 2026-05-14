"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { backlogQuery } from "@/lib/firebase/firestore";
import { TodoItem } from "@/lib/types";

export function useBacklog() {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = backlogQuery(user.uid);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setItems(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { items, loading };
}
