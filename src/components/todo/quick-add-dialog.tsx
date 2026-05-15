"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { addTodoItem, addDailyTask } from "@/lib/firebase/firestore";
import { SlotType, RecurrenceFrequency } from "@/lib/types";
import { format } from "date-fns";

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency | "none"; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannually", label: "Every 6 Months" },
  { value: "yearly", label: "Yearly" },
];

type Destination = SlotType | "daily";

const DESTINATION_OPTIONS: { value: Destination; label: string }[] = [
  { value: "essential", label: "Essential" },
  { value: "priority", label: "Priority" },
  { value: "outcome", label: "Outcome" },
  { value: "backlog", label: "Backlog" },
  { value: "daily", label: "Daily" },
];

function getDefaultDestination(pathname: string): Destination {
  if (pathname === "/today") return "outcome";
  if (pathname === "/backlog") return "backlog";
  if (pathname === "/daily-tasks") return "daily";
  return "backlog";
}

export function QuickAddDialog() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | "none">("none");
  const [destination, setDestination] = useState<Destination>(() => getDefaultDestination(pathname));
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = useCallback(() => {
    setDestination(getDefaultDestination(pathname));
    setOpen(true);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "c" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        openDialog();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDialog]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function reset() {
    setTitle("");
    setDescription("");
    setDeadline("");
    setScheduledDate("");
    setRecurrence("none");
    setDestination(getDefaultDestination(pathname));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;

    if (destination === "daily") {
      await addDailyTask(user.uid, {
        title: title.trim(),
        description: description.trim(),
        sortOrder: Date.now(),
      });
    } else {
      const assignedDate = destination === "backlog" ? null : format(new Date(), "yyyy-MM-dd");
      await addTodoItem(user.uid, {
        title: title.trim(),
        description: description.trim(),
        slot: destination,
        assignedDate,
        scheduledDate: destination === "backlog" ? (scheduledDate || null) : null,
        deadline: deadline || null,
        recurrence: destination === "backlog" ? (recurrence === "none" ? null : recurrence) : null,
        sortOrder: Date.now(),
      });
    }

    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) { openDialog(); } else { reset(); setOpen(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            placeholder="Task name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Add to</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DESTINATION_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={destination === opt.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setDestination(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          {destination !== "daily" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Deadline (optional)
              </label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          {destination === "backlog" && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
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
                <label className="text-xs font-medium text-muted-foreground">
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
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
