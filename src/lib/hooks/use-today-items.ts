"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { todayItemsQuery } from "@/lib/firebase/firestore";
import { TodoItem, SlotType } from "@/lib/types";
import { format } from "date-fns";

export function useTodayItems(date?: Date) {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const q = todayItemsQuery(user.uid, dateStr);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setItems(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, dateStr]);

  const getSlotItems = (slot: SlotType) =>
    items.filter((item) => item.slot === slot);

  return { items, loading, getSlotItems };
}
