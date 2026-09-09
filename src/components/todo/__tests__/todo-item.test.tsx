import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodoItem } from "@/components/todo/todo-item";
import { TodoItem as TodoItemType } from "@/lib/types";

function item(overrides: Partial<TodoItemType> = {}): TodoItemType {
  return {
    id: "todo-1",
    title: "Write the thing",
    description: "",
    slot: "backlog",
    assignedDate: null,
    scheduledDate: null,
    deadline: null,
    completed: false,
    completedAt: null,
    notifyOnDeadline: false,
    notifyOnScheduledDate: false,
    recurrence: null,
    sortOrder: 0,
    createdAt: null as unknown as TodoItemType["createdAt"],
    updatedAt: null as unknown as TodoItemType["updatedAt"],
    ...overrides,
  };
}

describe("TodoItem", () => {
  it("shows completed styling immediately while toggle is pending", () => {
    const onToggle = vi.fn(() => new Promise<void>(() => {}));
    render(
      <TodoItem
        item={item()}
        onToggle={onToggle}
        onDelete={() => {}}
        onEdit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Write the thing")).toHaveClass("line-through");
    expect(onToggle).toHaveBeenCalledWith("todo-1", true);
  });

  it("rolls visual completion back when toggle fails", async () => {
    const onToggle = vi.fn(() => Promise.reject(new Error("nope")));
    render(
      <TodoItem
        item={item()}
        onToggle={onToggle}
        onDelete={() => {}}
        onEdit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(screen.getByText("Write the thing")).not.toHaveClass("line-through")
    );
  });

  it("syncs visual completion from incoming props", () => {
    const { rerender } = render(
      <TodoItem
        item={item()}
        onToggle={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
      />
    );

    rerender(
      <TodoItem
        item={item({ completed: true })}
        onToggle={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
      />
    );

    expect(screen.getByText("Write the thing")).toHaveClass("line-through");
  });
});
