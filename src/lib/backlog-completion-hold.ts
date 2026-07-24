import { TodoItem } from "@/lib/types";

export function preserveRecentlyCompletedOrder(
  items: TodoItem[],
  recentlyCompleted: Set<string>,
  previousOrder: Map<string, number>
) {
  if (recentlyCompleted.size === 0) return items;

  return [...items].sort((a, b) => {
    const aHeld = a.completed && recentlyCompleted.has(a.id);
    const bHeld = b.completed && recentlyCompleted.has(b.id);
    if (!aHeld && !bHeld) return 0;

    const aOrder = previousOrder.get(a.id);
    const bOrder = previousOrder.get(b.id);
    if (aOrder === undefined || bOrder === undefined) return 0;

    return aOrder - bOrder;
  });
}
