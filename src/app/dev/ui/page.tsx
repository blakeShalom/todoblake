"use client";

import { useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { CheckCircle, Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyTaskItem } from "@/components/todo/daily-task-item";
import { TodoItem } from "@/components/todo/todo-item";
import { TodoItemForm } from "@/components/todo/todo-item-form";
import { SyncIndicator } from "@/components/sync/sync-indicator";
import {
  DailyTask,
  RecurrenceFrequency,
  SlotType,
  TodoItem as TodoItemType,
} from "@/lib/types";

const mockDate = new Date("2026-05-20T12:00:00Z");
const now = {
  seconds: Math.floor(mockDate.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => mockDate,
  toMillis: () => mockDate.getTime(),
  isEqual: (other: Timestamp) => other.toMillis() === mockDate.getTime(),
} as Timestamp;
const LONG_TITLE =
  "USPSInformeddelivery@email.informeddelivery.usps.com-forwarding-rule-investigation-with-a-very-long-unbroken-title";

function mockTodo(overrides: Partial<TodoItemType>): TodoItemType {
  return {
    id: "mock-todo",
    title: "Mock todo",
    description: "",
    slot: "backlog",
    assignedDate: null,
    scheduledDate: null,
    deadline: null,
    completed: false,
    completedAt: null,
    sortOrder: 0,
    recurrence: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mockDailyTask(overrides: Partial<DailyTask>): DailyTask {
  return {
    id: "mock-daily-task",
    title: "Review goals",
    description: "",
    sortOrder: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const todos = [
  mockTodo({
    id: "essential",
    title: "Finish the one essential task",
    slot: "essential",
    assignedDate: "2026-05-20",
    deadline: "2026-05-20",
  }),
  mockTodo({
    id: "recurring",
    title: "Tidy desktop / downloads",
    recurrence: "weekly",
    scheduledDate: "2026-05-20",
    deadline: "2026-05-24",
  }),
  mockTodo({
    id: "long-title",
    title: LONG_TITLE,
    description:
      "This row intentionally uses a long unbroken title so mobile overflow is easy to spot.",
    recurrence: "monthly",
    scheduledDate: "2026-06-01",
  }),
  mockTodo({
    id: "completed",
    title: "Completed backlog item",
    completed: true,
    completedAt: now,
  }),
];

const dailyTasks = [
  mockDailyTask({ id: "daily-open", title: "Walk for 20 minutes" }),
  mockDailyTask({ id: "daily-done", title: "Read scripture and journal" }),
];

export default function DevUiPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["recurring"]));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLongForm, setShowLongForm] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<string>("No form submissions yet.");

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold">Dev UI unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This route is only intended for local development.
        </p>
      </main>
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFormSubmit(data: {
    title: string;
    description: string;
    deadline: string | null;
    scheduledDate: string | null;
    recurrence: RecurrenceFrequency | null;
    slot: SlotType;
  }) {
    setLastSubmit(
      JSON.stringify(
        {
          title: data.title,
          deadline: data.deadline,
          scheduledDate: data.scheduledDate,
          recurrence: data.recurrence,
          slot: data.slot,
        },
        null,
        2
      )
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-5xl space-y-8 px-4 py-6 pb-12">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">TodoBlake Dev UI</h1>
            <p className="text-sm text-muted-foreground">
              Auth-free component states for mobile and desktop visual checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 rounded-lg border p-2">
            <SyncIndicator syncState={{ fromCache: false, hasPendingWrites: false }} />
            <SyncIndicator syncState={{ fromCache: true, hasPendingWrites: false }} />
            <SyncIndicator syncState={{ fromCache: false, hasPendingWrites: true }} />
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Backlog Rows
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowLongForm(true)}>
                Long form
              </Button>
              <Button size="sm" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {todos.map((item, index) => (
              <TodoItem
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                draggableItem
                dragging={index === 1}
                dragOver={index === 2}
                onSelect={toggleSelect}
                onToggle={() => {}}
                onDelete={() => {}}
                onEdit={() => setShowLongForm(true)}
                onReorderStart={() => {}}
              />
            ))}
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="space-y-2 rounded-lg border p-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Today 1-2-3
            </h2>
            <div className="space-y-1.5">
              {["The One Thing", "Two Priorities", "Three Outcomes"].map((label, index) => (
                <div key={label} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}/{index + 1}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {index === 0 ? "Prepare morning priorities" : "Mock slot item"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border p-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Daily Tasks
            </h2>
            <DailyTaskItem
              task={dailyTasks[0]}
              completed={false}
              onToggle={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
            <DailyTaskItem
              task={dailyTasks[1]}
              completed
              onToggle={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </section>

          <section className="space-y-2 rounded-lg border p-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              History / Deadlines
            </h2>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="flex-1 text-sm text-muted-foreground line-through">
                Completed outcome with a deadline
              </span>
              <Badge variant="secondary" className="text-xs">
                Outcome
              </Badge>
              <span className="text-xs text-muted-foreground">May 20</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Upcoming deadline</span>
              <Badge variant="outline" className="text-xs">
                May 24
              </Badge>
            </div>
          </section>
        </aside>
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Last Mock Form Submission
          </h2>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{lastSubmit}</pre>
      </section>

      <TodoItemForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleFormSubmit}
        defaultSlot="backlog"
        showScheduling
      />

      <TodoItemForm
        open={showLongForm}
        onClose={() => setShowLongForm(false)}
        onSubmit={handleFormSubmit}
        defaultSlot="backlog"
        showScheduling
        initialData={{
          title: LONG_TITLE,
          description:
            "Long title stress case. Open this on a narrow mobile viewport and make sure inputs, recurrence options, and footer buttons stay inside the modal.",
          deadline: "2026-05-24",
          scheduledDate: "2026-06-01",
          recurrence: "quarterly",
        }}
      />
    </main>
  );
}
