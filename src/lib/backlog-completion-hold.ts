import { TodoItem } from "@/lib/types";

export function preserveRecentlyCompletedOrder(
  items: TodoItem[],
  recentlyCompleted: Set<string>,
  previousOrder: Map<string, number>
) {
  if (recentlyCompleted.size === 0) return items;

  const heldItems = items
    .filter((item) => item.completed && recentlyCompleted.has(item.id))
    .map((item) => ({ item, previousIndex: previousOrder.get(item.id) }))
    .filter(
      (held): held is { item: TodoItem; previousIndex: number } =>
        held.previousIndex !== undefined
    )
    .sort((a, b) => a.previousIndex - b.previousIndex);

  if (heldItems.length === 0) return items;

  const heldIds = new Set(heldItems.map(({ item }) => item.id));
  const reordered = items.filter((item) => !heldIds.has(item.id));

  for (const { item, previousIndex } of heldItems) {
    reordered.splice(Math.min(previousIndex, reordered.length), 0, item);
  }

  return reordered;
}
