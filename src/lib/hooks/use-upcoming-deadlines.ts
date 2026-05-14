"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, collection, where, orderBy } from "firebase/firestore";
import { format, addDays } from "date-fns";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/config";
import { TodoItem } from "@/lib/types";

export function useUpcomingDeadlines() {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysOut = format(addDays(new Date(), 30), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    const col = collection(db, "users", user.uid, "todoItems");

    const q = query(
      col,
      where("completed", "==", false),
      where("deadline", ">=", today),
      where("deadline", "<=", thirtyDaysOut),
      orderBy("deadline", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: TodoItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TodoItem[];
      setItems(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, today, thirtyDaysOut]);

  const sevenDaysOut = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const next7Days = items.filter((item) => item.deadline! <= sevenDaysOut);
  const next8to30Days = items.filter((item) => item.deadline! > sevenDaysOut);

  return { next7Days, next8to30Days, loading };
}
