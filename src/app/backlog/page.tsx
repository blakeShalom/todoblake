"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
} from "@/lib/firebase/firestore";
import { TodoItem as TodoItemType, SlotType } from "@/lib/types";

export default function BacklogPage() {
  const { items, loading } = useBacklog();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TodoItemType | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const filtered = items.filter((item) => {
    if (filter === "active") return !item.completed;
    if (filter === "completed") return item.completed;
    return true;
  });

  async function handleAdd(data: {
    title: string;
    description: string;
    deadline: string | null;
    slot: SlotType;
  }) {
    if (!user) return;
    await addTodoItem(user.uid, {
      title: data.title,
      description: data.description,
      slot: "backlog",
      assignedDate: null,
      deadline: data.deadline,
      sortOrder: items.length,
    });
  }

  async function handleToggle(id: string, completed: boolean) {
    if (!user) return;
    await updateTodoItem(user.uid, id, { completed });
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteTodoItem(user.uid, id);
  }

  async function handleEdit(data: {
    title: string;
    description: string;
    deadline: string | null;
  }) {
    if (!user || !editItem) return;
    await updateTodoItem(user.uid, editItem.id, {
      title: data.title,
      description: data.description,
      deadline: data.deadline,
    });
    setEditItem(null);
  }

  async function handlePromote(item: TodoItemType, slot: SlotType) {
    if (!user) return;
    await updateTodoItem(user.uid, item.id, {
      slot,
      assignedDate: format(new Date(), "yyyy-MM-dd"),
    });
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Backlog</h1>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
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

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((item) => (
                <div key={item.id} className="relative">
                  <TodoItem
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={setEditItem}
                  />
                  {!item.completed && (
                    <div className="absolute right-2 top-2 hidden group-hover:flex">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handlePromote(item, "outcome")}
                      >
                        → Today
                      </Button>
                    </div>
                  )}
                </div>
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

          <TodoItemForm
            open={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleAdd}
            defaultSlot="backlog"
          />

          {editItem && (
            <TodoItemForm
              open={true}
              onClose={() => setEditItem(null)}
              onSubmit={handleEdit}
              defaultSlot="backlog"
              initialData={{
                title: editItem.title,
                description: editItem.description,
                deadline: editItem.deadline,
              }}
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
