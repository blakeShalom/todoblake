"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, GripVertical, Pencil, Repeat } from "lucide-react";
import { TodoItem as TodoItemType } from "@/lib/types";
import { format, isPast, isToday } from "date-fns";

interface TodoItemProps {
  item: TodoItemType;
  onToggle: (id: string, completed: boolean) => void | Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (item: TodoItemType) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
  draggableItem?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onReorderStart?: (
    id: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) => void;
}

export function TodoItem({
  item,
  onToggle,
  onDelete,
  onEdit,
  selected = false,
  onSelect,
  draggableItem = false,
  dragging = false,
  dragOver = false,
  onReorderStart,
}: TodoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [lastCompletedProp, setLastCompletedProp] = useState(item.completed);
  const [optimisticCompleted, setOptimisticCompleted] = useState<
    boolean | null
  >(null);
  const [togglePending, setTogglePending] = useState(false);
  if (item.completed !== lastCompletedProp) {
    setLastCompletedProp(item.completed);
    setOptimisticCompleted(null);
  }
  const visualCompleted = optimisticCompleted ?? item.completed;
  const selectable = !!onSelect && !visualCompleted;

  function deadlineBadgeVariant(): "destructive" | "secondary" | "outline" {
    if (!item.deadline) return "outline";
    const d = new Date(item.deadline + "T00:00:00");
    if (isPast(d) && !isToday(d)) return "destructive";
    if (isToday(d)) return "secondary";
    return "outline";
  }

  function handleSelect() {
    if (selectable) onSelect(item.id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!selectable || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onSelect(item.id);
  }

  async function handleToggle(checked: boolean) {
    if (togglePending || checked === visualCompleted) return;

    const previous = visualCompleted;
    setOptimisticCompleted(checked);
    setTogglePending(true);
    try {
      await onToggle(item.id, checked);
    } catch (error) {
      console.error("Failed to toggle todo item", error);
      setOptimisticCompleted(previous === item.completed ? null : previous);
    } finally {
      setTogglePending(false);
    }
  }

  return (
    <div
      className={`group flex min-w-0 flex-col rounded-lg border p-3 transition-all duration-200 ease-out ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : dragOver
            ? "border-primary/60 bg-primary/5"
            : dragging
              ? "border-primary/40 opacity-60"
              : visualCompleted
                ? "bg-muted/30 text-muted-foreground hover:bg-muted/40"
                : "hover:bg-muted/50"
      } ${selectable ? "cursor-pointer" : ""}`}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      data-todo-item-id={item.id}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="flex min-w-0 items-center gap-3">
        {draggableItem && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              onReorderStart?.(item.id, e);
            }}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        )}
        <Checkbox
          checked={visualCompleted}
          disabled={togglePending}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={(checked) => handleToggle(checked === true)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={`min-w-40 flex-1 break-words text-sm transition-all duration-200 ease-out [overflow-wrap:anywhere] ${visualCompleted ? "text-muted-foreground line-through decoration-muted-foreground/70" : ""}`}
            >
              {item.title}
            </span>
            {item.recurrence && (
              <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                <Repeat className="h-3 w-3" />
                {item.recurrence}
              </Badge>
            )}
            {item.deadline && (
              <Badge variant={deadlineBadgeVariant()} className="shrink-0 text-xs">
                {format(new Date(item.deadline + "T00:00:00"), "MMM d")}
              </Badge>
            )}
            {item.description && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-destructive opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      {expanded && item.description && (
        <p className="mt-2 min-w-0 break-words pl-9 text-sm text-muted-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">
          {item.description}
        </p>
      )}
    </div>
  );
}
