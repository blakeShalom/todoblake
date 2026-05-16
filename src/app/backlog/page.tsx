"use client";

import { useRef, useState } from "react";
import { Plus, ArrowUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { TodoItem } from "@/components/todo/todo-item";
import { TodoItemForm } from "@/components/todo/todo-item-form";
import { useBacklog } from "@/lib/hooks/use-backlog";
import { useAuth } from "@/components/auth/auth-provider";
import {
  addTodoItem,
  updateTodoItem,
  deleteTodoItem,
  updateTodoItemOrder,
} from "@/lib/firebase/firestore";
import { TodoItem as TodoItemType, SlotType, RecurrenceFrequency } from "@/lib/types";

type PromoteSlot = "essential" | "priority" | "outcome";

const PROMOTE_OPTIONS: { value: PromoteSlot; label: string; icon: string }[] = [
  { value: "essential", label: "Essential", icon: "★" },
  { value: "priority", label: "Priority", icon: "◆" },
  { value: "outcome", label: "Outcome", icon: "●" },
];

const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannually: "Every 6 Months",
  yearly: "Yearly",
};

export default function BacklogPage() {
  const { items, scheduled, loading } = useBacklog();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TodoItemType | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showScheduled, setShowScheduled] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragOverRef = useRef<string | null>(null);

  const filtered = items.filter((item) => {
    if (filter === "active") return !item.completed;
    if (filter === "completed") return item.completed;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleReorder(sourceId: string, targetId: string) {
    if (!user || sourceId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      dragOverRef.current = null;
      return;
    }

    const fromIndex = filtered.findIndex((item) => item.id === sourceId);
    const toIndex = filtered.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      setDragOverId(null);
      dragOverRef.current = null;
      return;
    }

    const reordered = [...filtered];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await updateTodoItemOrder(
      user.uid,
      reordered.map((item) => item.id)
    );
    setDraggingId(null);
    setDragOverId(null);
    dragOverRef.current = null;
  }

  function handleReorderStart(
    id: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setDragOverId(null);
    dragOverRef.current = null;

    function handlePointerMove(moveEvent: PointerEvent) {
      const target = document
        .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest<HTMLElement>("[data-todo-item-id]");
      const targetId = target?.dataset.todoItemId ?? null;
      const nextDragOverId = targetId && targetId !== id ? targetId : null;
      dragOverRef.current = nextDragOverId;
      setDragOverId(nextDragOverId);
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      const targetId = dragOverRef.current;
      if (targetId) {
        handleReorder(id, targetId);
      } else {
        setDraggingId(null);
        setDragOverId(null);
        dragOverRef.current = null;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  async function handlePromoteSelected(slot: PromoteSlot) {
    if (!user || selected.size === 0) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const promises = Array.from(selected).map((id) =>
      updateTodoItem(user.uid, id, { slot, assignedDate: today })
    );
    await Promise.all(promises);
    clearSelection();
  }

  async function handleAdd(data: {
    title: string;
    description: string;
    deadline: string | null;
    scheduledDate: string | null;
    recurrence: RecurrenceFrequency | null;
    slot: SlotType;
  }) {
    if (!user) return;
    await addTodoItem(user.uid, {
      title: data.title,
      description: data.description,
      slot: "backlog",
      assignedDate: null,
      scheduledDate: data.scheduledDate,
      deadline: data.deadline,
      recurrence: data.recurrence,
      sortOrder: items.length,
    });
  }

  async function handleToggle(id: string, completed: boolean) {
    if (!user) return;
    const item = items.find((i) => i.id === id);
    await updateTodoItem(user.uid, id, { completed }, item);
    if (completed) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteTodoItem(user.uid, id);
  }

  async function handleEdit(data: {
    title: string;
    description: string;
    deadline: string | null;
    scheduledDate: string | null;
    recurrence: RecurrenceFrequency | null;
  }) {
    if (!user || !editItem) return;
    await updateTodoItem(user.uid, editItem.id, {
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      scheduledDate: data.scheduledDate,
      recurrence: data.recurrence,
    });
    setEditItem(null);
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Backlog</h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowScheduled(!showScheduled)}
              >
                <Clock className="h-4 w-4" />
                Scheduled{scheduled.length > 0 && ` (${scheduled.length})`}
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            {(["all", "active", "completed"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="sticky top-16 z-30 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-sm">
              <ArrowUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selected.size} selected — move to:
              </span>
              {PROMOTE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => handlePromoteSelected(opt.value)}
                >
                  {opt.icon} {opt.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-xs"
                onClick={clearSelection}
              >
                Cancel
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((item) => (
                <TodoItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={setEditItem}
                  selected={selected.has(item.id)}
                  onSelect={toggleSelect}
                  draggableItem
                  dragging={draggingId === item.id}
                  dragOver={dragOverId === item.id && draggingId !== item.id}
                  onReorderStart={handleReorderStart}
                />
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  {filter === "all"
                    ? "No items in backlog"
                    : `No ${filter} items`}
                </p>
              )}
            </div>
          )}

          {showScheduled && scheduled.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" /> Upcoming Scheduled
              </h2>
              <div className="space-y-1.5">
                {scheduled.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="flex-1 text-sm">{item.title}</span>
                    {item.recurrence && (
                      <Badge variant="outline" className="text-xs">
                        {RECURRENCE_LABELS[item.recurrence]}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {item.scheduledDate && format(new Date(item.scheduledDate + "T00:00:00"), "MMM d")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TodoItemForm
            open={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleAdd}
            defaultSlot="backlog"
            showScheduling
          />

          {editItem && (
            <TodoItemForm
              open={true}
              onClose={() => setEditItem(null)}
              onSubmit={handleEdit}
              defaultSlot="backlog"
              showScheduling
              initialData={{
                title: editItem.title,
                description: editItem.description,
                deadline: editItem.deadline,
                scheduledDate: editItem.scheduledDate,
                recurrence: editItem.recurrence,
              }}
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
