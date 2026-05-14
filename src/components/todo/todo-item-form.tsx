"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlotType, RecurrenceFrequency } from "@/lib/types";

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency | "none"; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

interface TodoItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    deadline: string | null;
    scheduledDate: string | null;
    recurrence: RecurrenceFrequency | null;
    slot: SlotType;
  }) => void;
  defaultSlot?: SlotType;
  showScheduling?: boolean;
  initialData?: {
    title: string;
    description: string;
    deadline: string | null;
    scheduledDate?: string | null;
    recurrence?: RecurrenceFrequency | null;
  };
}

export function TodoItemForm({
  open,
  onClose,
  onSubmit,
  defaultSlot = "backlog",
  showScheduling = false,
  initialData,
}: TodoItemFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [deadline, setDeadline] = useState(initialData?.deadline || "");
  const [scheduledDate, setScheduledDate] = useState(initialData?.scheduledDate || "");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | "none">(
    initialData?.recurrence || "none"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline || null,
      scheduledDate: scheduledDate || null,
      recurrence: recurrence === "none" ? null : recurrence,
      slot: defaultSlot,
    });
    setTitle("");
    setDescription("");
    setDeadline("");
    setScheduledDate("");
    setRecurrence("none");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Item" : "Add Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Deadline (optional)
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
          {showScheduling && (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Schedule for date (optional)
                </label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Recurrence
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={recurrence === opt.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setRecurrence(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {initialData ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
