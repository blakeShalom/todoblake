import { describe, expect, it } from "vitest";
import { preserveRecentlyCompletedOrder } from "@/lib/backlog-completion-hold";
import { TodoItem } from "@/lib/types";

function todo(id: string, completed: boolean): TodoItem {
  return {
    id,
    title: id,
    description: "",
    slot: "backlog",
    assignedDate: null,
    scheduledDate: null,
    deadline: null,
    completed,
    completedAt: null,
    notifyOnDeadline: false,
    notifyOnScheduledDate: false,
    recurrence: null,
    sortOrder: 0,
    createdAt: null as unknown as TodoItem["createdAt"],
    updatedAt: null as unknown as TodoItem["updatedAt"],
  };
}

describe("preserveRecentlyCompletedOrder", () => {
  it("keeps a recently completed item in its previous position", () => {
    const items = [todo("a", false), todo("c", false), todo("b", true)];
    const result = preserveRecentlyCompletedOrder(
      items,
      new Set(["b"]),
      new Map([
        ["a", 0],
        ["b", 1],
        ["c", 2],
      ])
    );

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps a later completed item in its original row position", () => {
    const items = [
      todo("a", false),
      todo("b", false),
      todo("d", false),
      todo("e", false),
      todo("c", true),
    ];
    const result = preserveRecentlyCompletedOrder(
      items,
      new Set(["c"]),
      new Map([
        ["a", 0],
        ["b", 1],
        ["c", 2],
        ["d", 3],
        ["e", 4],
      ])
    );

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("preserves completed-last ordering when no hold is active", () => {
    const items = [todo("a", false), todo("c", false), todo("b", true)];
    const result = preserveRecentlyCompletedOrder(items, new Set(), new Map());

    expect(result).toBe(items);
    expect(result.map((item) => item.id)).toEqual(["a", "c", "b"]);
  });
});
