"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { DailyTask } from "@/lib/types";

interface DailyTaskItemProps {
  task: DailyTask;
  completed: boolean;
  onToggle: () => void;
  onEdit: (task: DailyTask) => void;
  onDelete: (id: string) => void;
}

export function DailyTaskItem({
  task,
  completed,
  onToggle,
  onEdit,
  onDelete,
}: DailyTaskItemProps) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <Checkbox checked={completed} onCheckedChange={onToggle} />
      <span
        className={`flex-1 text-sm ${completed ? "text-muted-foreground line-through" : ""}`}
      >
        {task.title}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={() => onEdit(task)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(task.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
