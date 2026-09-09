"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DailyTask } from "@/lib/types";

interface DailyTaskItemProps {
  task: DailyTask;
  completed: boolean;
  onToggle: () => void | Promise<void>;
  onEdit?: (task: DailyTask) => void;
}

export function DailyTaskItem({
  task,
  completed,
  onToggle,
  onEdit,
}: DailyTaskItemProps) {
  const [lastCompletedProp, setLastCompletedProp] = useState(completed);
  const [optimisticCompleted, setOptimisticCompleted] = useState<
    boolean | null
  >(null);
  const [togglePending, setTogglePending] = useState(false);
  if (completed !== lastCompletedProp) {
    setLastCompletedProp(completed);
    setOptimisticCompleted(null);
  }
  const visualCompleted = optimisticCompleted ?? completed;

  async function handleToggle(checked: boolean) {
    if (togglePending || checked === visualCompleted) return;

    const previous = visualCompleted;
    setOptimisticCompleted(checked);
    setTogglePending(true);
    try {
      await onToggle();
    } catch (error) {
      console.error("Failed to toggle daily task", error);
      setOptimisticCompleted(previous === completed ? null : previous);
    } finally {
      setTogglePending(false);
    }
  }

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 ease-out ${
        visualCompleted
          ? "bg-muted/30 text-muted-foreground hover:bg-muted/40"
          : "hover:bg-muted/50"
      }`}
    >
      <Checkbox
        checked={visualCompleted}
        disabled={togglePending}
        onCheckedChange={(checked) => handleToggle(checked === true)}
      />
      <span
        className={`flex-1 text-sm transition-all duration-200 ease-out ${visualCompleted ? "text-muted-foreground line-through decoration-muted-foreground/70" : ""}`}
      >
        {task.title}
      </span>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          aria-label={`Edit ${task.title}`}
          onClick={() => onEdit(task)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
