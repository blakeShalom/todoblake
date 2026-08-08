import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailyTaskItem } from "@/components/todo/daily-task-item";
import { DailyTask } from "@/lib/types";

function task(overrides: Partial<DailyTask> = {}): DailyTask {
  return {
    id: "daily-1",
    title: "Drink water",
    description: "",
    sortOrder: 0,
    active: true,
    createdAt: null as unknown as DailyTask["createdAt"],
    updatedAt: null as unknown as DailyTask["updatedAt"],
    ...overrides,
  };
}

describe("DailyTaskItem", () => {
  it("provides an accessible edit action", () => {
    const onEdit = vi.fn();
    render(
      <DailyTaskItem
        task={task()}
        completed={false}
        onToggle={() => {}}
        onEdit={onEdit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Drink water" }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "daily-1" }));
  });

  it("does not render management actions when they are not provided", () => {
    render(
      <DailyTaskItem task={task()} completed={false} onToggle={() => {}} />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows completed styling immediately while toggle is pending", () => {
    const onToggle = vi.fn(() => new Promise<void>(() => {}));
    render(
      <DailyTaskItem
        task={task()}
        completed={false}
        onToggle={onToggle}
        onEdit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Drink water")).toHaveClass("line-through");
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("rolls visual completion back when toggle fails", async () => {
    const onToggle = vi.fn(() => Promise.reject(new Error("nope")));
    render(
      <DailyTaskItem
        task={task()}
        completed={false}
        onToggle={onToggle}
        onEdit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(screen.getByText("Drink water")).not.toHaveClass("line-through")
    );
  });

  it("syncs visual completion from incoming props", () => {
    const { rerender } = render(
      <DailyTaskItem
        task={task()}
        completed={false}
        onToggle={() => {}}
        onEdit={() => {}}
      />
    );

    rerender(
      <DailyTaskItem
        task={task()}
        completed
        onToggle={() => {}}
        onEdit={() => {}}
      />
    );

    expect(screen.getByText("Drink water")).toHaveClass("line-through");
  });
});
