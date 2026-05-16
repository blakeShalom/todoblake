"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, Pencil, Repeat } from "lucide-react";
import { TodoItem as TodoItemType } from "@/lib/types";
import { format, isPast, isToday } from "date-fns";

interface TodoItemProps {
  item: TodoItemType;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (item: TodoItemType) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function TodoItem({
  item,
  onToggle,
  onDelete,
  onEdit,
  selected = false,
  onSelect,
}: TodoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const selectable = !!onSelect && !item.completed;

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

  return (
    <div
      className={`group flex flex-col rounded-lg border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:bg-muted/50"
      } ${selectable ? "cursor-pointer" : ""}`}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={item.completed}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
        />
        <span
          className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : ""}`}
        >
          {item.title}
        </span>
        {item.recurrence && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Repeat className="h-3 w-3" />
            {item.recurrence}
          </Badge>
        )}
        {item.deadline && (
          <Badge variant={deadlineBadgeVariant()} className="text-xs">
            {format(new Date(item.deadline + "T00:00:00"), "MMM d")}
          </Badge>
        )}
        {item.description && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
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
          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded && item.description && (
        <p className="mt-2 pl-9 text-sm text-muted-foreground whitespace-pre-wrap">
          {item.description}
        </p>
      )}
    </div>
  );
}
