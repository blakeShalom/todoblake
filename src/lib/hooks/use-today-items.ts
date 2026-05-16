"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { todayItemsQuery } from "@/lib/firebase/firestore";
import { TodoItem, SlotType, SyncState } from "@/lib/types";
import { format } from "date-fns";

const SYNCED: SyncState = { fromCache: false, hasPendingWrites: false };

export function useTodayItems(date?: Date) {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>(SYNCED);

  const dateStr = format(date || new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const q = todayItemsQuery(user.uid, dateStr);
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setItems(results);
      setSyncState({
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [user, dateStr]);

  const getSlotItems = (slot: SlotType) =>
    items.filter((item) => item.slot === slot);

  return { items, loading, syncState, getSlotItems };
}
