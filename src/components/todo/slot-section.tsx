"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodoItem } from "./todo-item";
import { TodoItemForm } from "./todo-item-form";
import { TodoItem as TodoItemType, SlotType, SLOT_LIMITS } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-provider";
import { addTodoItem, updateTodoItem, deleteTodoItem } from "@/lib/firebase/firestore";
import { format } from "date-fns";

interface SlotSectionProps {
  title: string;
  icon: string;
  slot: SlotType;
  items: TodoItemType[];
}

export function SlotSection({ title, icon, slot, items }: SlotSectionProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TodoItemType | null>(null);
  const limit = slot === "backlog" ? Infinity : SLOT_LIMITS[slot];
  const atCapacity = items.length >= limit;

  async function handleAdd(data: {
    title: string;
    description: string;
    deadline: string | null;
    scheduledDate: string | null;
    recurrence: import("@/lib/types").RecurrenceFrequency | null;
  }) {
    if (!user) return;
    await addTodoItem(user.uid, {
      title: data.title,
      description: data.description,
      slot,
      assignedDate: format(new Date(), "yyyy-MM-dd"),
      deadline: data.deadline,
      sortOrder: items.length,
    });
  }

  async function handleToggle(id: string, completed: boolean) {
    if (!user) return;
    const item = items.find((i) => i.id === id);
    await updateTodoItem(user.uid, id, { completed }, item);
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
    recurrence: import("@/lib/types").RecurrenceFrequency | null;
  }) {
    if (!user || !editItem) return;
    await updateTodoItem(user.uid, editItem.id, {
      title: data.title,
      description: data.description,
      deadline: data.deadline,
    });
    setEditItem(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{icon}</span>
          {title}
          {slot !== "backlog" && (
            <span className="text-xs font-normal">
              ({items.length}/{limit})
            </span>
          )}
        </h2>
        {!atCapacity && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <TodoItem
            key={item.id}
            item={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={setEditItem}
          />
        ))}
        {items.length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No items yet
          </p>
        )}
      </div>

      <TodoItemForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
        defaultSlot={slot}
      />

      {editItem && (
        <TodoItemForm
          open={true}
          onClose={() => setEditItem(null)}
          onSubmit={handleEdit}
          defaultSlot={slot}
          initialData={{
            title: editItem.title,
            description: editItem.description,
            deadline: editItem.deadline,
          }}
        />
      )}
    </div>
  );
}
