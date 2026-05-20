import { describe, it, expect } from "vitest";
import { getNextScheduledDate, shouldReturnToBacklog } from "../firestore";
import { TodoItem } from "@/lib/types";

function todoItem(overrides: Partial<TodoItem>): TodoItem {
  return {
    id: "item-1",
    title: "Test item",
    description: "",
    slot: "essential",
    assignedDate: "2026-05-19",
    scheduledDate: null,
    deadline: null,
    completed: false,
    completedAt: null,
    sortOrder: 0,
    recurrence: null,
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  };
}

describe("getNextScheduledDate", () => {
  it("advances daily by 1 day", () => {
    expect(getNextScheduledDate("2026-05-15", "daily")).toBe("2026-05-16");
  });

  it("advances weekly by 7 days", () => {
    expect(getNextScheduledDate("2026-05-15", "weekly")).toBe("2026-05-22");
  });

  it("advances biweekly by 14 days", () => {
    expect(getNextScheduledDate("2026-05-15", "biweekly")).toBe("2026-05-29");
  });

  it("advances monthly by 1 month", () => {
    expect(getNextScheduledDate("2026-05-15", "monthly")).toBe("2026-06-15");
  });

  it("advances quarterly by 3 months", () => {
    expect(getNextScheduledDate("2026-05-15", "quarterly")).toBe("2026-08-15");
  });

  it("handles month boundary (daily from Jan 31)", () => {
    expect(getNextScheduledDate("2026-01-31", "daily")).toBe("2026-02-01");
  });

  it("handles year boundary (daily from Dec 31)", () => {
    expect(getNextScheduledDate("2026-12-31", "daily")).toBe("2027-01-01");
  });

  it("handles month overflow (monthly from Jan 31 → Feb 28)", () => {
    const result = getNextScheduledDate("2026-01-31", "monthly");
    expect(result).toBe("2026-03-03");
  });

  it("handles weekly across month boundary", () => {
    expect(getNextScheduledDate("2026-05-28", "weekly")).toBe("2026-06-04");
  });

  it("handles quarterly across year boundary", () => {
    expect(getNextScheduledDate("2026-11-15", "quarterly")).toBe("2027-02-15");
  });

  it("advances semiannually by 6 months", () => {
    expect(getNextScheduledDate("2026-05-15", "semiannually")).toBe("2026-11-15");
  });

  it("handles semiannually across year boundary", () => {
    expect(getNextScheduledDate("2026-09-15", "semiannually")).toBe("2027-03-15");
  });

  it("advances yearly by 1 year", () => {
    expect(getNextScheduledDate("2026-05-15", "yearly")).toBe("2027-05-15");
  });

  it("handles yearly on leap day", () => {
    expect(getNextScheduledDate("2024-02-29", "yearly")).toBe("2025-03-01");
  });
});

describe("shouldReturnToBacklog", () => {
  it("returns unfinished older 1-2-3 items to backlog", () => {
    expect(shouldReturnToBacklog(todoItem({ slot: "essential" }), "2026-05-20")).toBe(true);
    expect(shouldReturnToBacklog(todoItem({ slot: "priority" }), "2026-05-20")).toBe(true);
    expect(shouldReturnToBacklog(todoItem({ slot: "outcome" }), "2026-05-20")).toBe(true);
  });

  it("leaves completed, current-day, and backlog items alone", () => {
    expect(
      shouldReturnToBacklog(todoItem({ completed: true }), "2026-05-20")
    ).toBe(false);
    expect(
      shouldReturnToBacklog(todoItem({ assignedDate: "2026-05-20" }), "2026-05-20")
    ).toBe(false);
    expect(
      shouldReturnToBacklog(todoItem({ slot: "backlog" }), "2026-05-20")
    ).toBe(false);
  });
});
