"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { SlotSection } from "@/components/todo/slot-section";
import { DailyTaskItem } from "@/components/todo/daily-task-item";
import { WeeklyTaskItem } from "@/components/todo/weekly-task-item";
import { useTodayItems } from "@/lib/hooks/use-today-items";
import { useDailyTasks } from "@/lib/hooks/use-daily-tasks";
import { useWeeklyTasks } from "@/lib/hooks/use-weekly-tasks";
import { useUpcomingDeadlines } from "@/lib/hooks/use-upcoming-deadlines";
import { useAuth } from "@/components/auth/auth-provider";
import {
  addWeeklyTask,
  deleteWeeklyTask,
  toggleDailyTaskCompletion,
  toggleWeeklyTaskCompletion,
  updateWeeklyTask,
} from "@/lib/firebase/firestore";
import { TodoItem, WeeklyTask } from "@/lib/types";

const SLOT_LABELS: Record<string, string> = {
  essential: "Essential",
  priority: "Priority",
  outcome: "Outcome",
  backlog: "Backlog",
};

function DeadlineItem({ item }: { item: TodoItem }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="flex-1 text-sm">{item.title}</span>
      <Badge variant="secondary" className="text-xs">
        {SLOT_LABELS[item.slot]}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {format(new Date(item.deadline + "T00:00:00"), "MMM d")}
      </Badge>
    </div>
  );
}

export default function TodayPage() {
  const today = new Date();
  const { getSlotItems, loading } = useTodayItems(today);
  const { tasks, isCompleted, getCompletionId, loading: tasksLoading } = useDailyTasks(today);
  const {
    tasks: weeklyTasks,
    isCompleted: isWeeklyCompleted,
    getCompletionId: getWeeklyCompletionId,
    loading: weeklyTasksLoading,
    weekStart,
  } = useWeeklyTasks(today);
  const { next7Days, next8to30Days, loading: deadlinesLoading } = useUpcomingDeadlines();
  const { user } = useAuth();
  const dateStr = format(today, "yyyy-MM-dd");
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [editWeeklyTask, setEditWeeklyTask] = useState<WeeklyTask | null>(null);
  const [weeklyTitle, setWeeklyTitle] = useState("");
  const [weeklyDescription, setWeeklyDescription] = useState("");

  async function handleWeeklySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !weeklyTitle.trim()) return;

    if (editWeeklyTask) {
      await updateWeeklyTask(user.uid, editWeeklyTask.id, {
        title: weeklyTitle.trim(),
        description: weeklyDescription.trim(),
      });
    } else {
      await addWeeklyTask(user.uid, {
        title: weeklyTitle.trim(),
        description: weeklyDescription.trim(),
        sortOrder: weeklyTasks.length,
      });
    }
    closeWeeklyForm();
  }

  async function handleWeeklyDelete(id: string) {
    if (!user) return;
    await deleteWeeklyTask(user.uid, id);
  }

  function openWeeklyEdit(task: WeeklyTask) {
    setWeeklyTitle(task.title);
    setWeeklyDescription(task.description);
    setEditWeeklyTask(task);
  }

  function closeWeeklyForm() {
    setShowWeeklyForm(false);
    setEditWeeklyTask(null);
    setWeeklyTitle("");
    setWeeklyDescription("");
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-8">
          <h1 className="text-2xl font-bold">
            {format(today, "EEEE, MMMM d")}
          </h1>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <SlotSection
                title="The One Thing"
                icon="★"
                slot="essential"
                items={getSlotItems("essential")}
              />

              <SlotSection
                title="Two Priorities"
                icon="◆"
                slot="priority"
                items={getSlotItems("priority")}
              />

              <SlotSection
                title="Three Outcomes"
                icon="●"
                slot="outcome"
                items={getSlotItems("outcome")}
              />
            </>
          )}

          {!weeklyTasksLoading && weeklyTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>↻</span> Weekly Tasks
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowWeeklyForm(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {weeklyTasks.map((task) => (
                  <WeeklyTaskItem
                    key={task.id}
                    task={task}
                    completed={isWeeklyCompleted(task.id)}
                    onToggle={() => {
                      if (!user) return;
                      toggleWeeklyTaskCompletion(
                        user.uid,
                        task.id,
                        weekStart,
                        getWeeklyCompletionId(task.id)
                      );
                    }}
                    onEdit={openWeeklyEdit}
                    onDelete={handleWeeklyDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {!weeklyTasksLoading && weeklyTasks.length === 0 && (
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <span>↻</span> Weekly Tasks
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setShowWeeklyForm(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          )}

          {!tasksLoading && tasks.length > 0 && (
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <span>☑</span> Daily Tasks
              </h2>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <DailyTaskItem
                    key={task.id}
                    task={task}
                    completed={isCompleted(task.id)}
                    onToggle={() => {
                      if (!user) return;
                      toggleDailyTaskCompletion(
                        user.uid,
                        task.id,
                        dateStr,
                        getCompletionId(task.id)
                      );
                    }}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {!deadlinesLoading && (next7Days.length > 0 || next8to30Days.length > 0) && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Upcoming Deadlines
              </h2>

              {next7Days.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Next 7 days
                  </h3>
                  <div className="space-y-1.5">
                    {next7Days.map((item) => (
                      <DeadlineItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {next8to30Days.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Next 8–30 days
                  </h3>
                  <div className="space-y-1.5">
                    {next8to30Days.map((item) => (
                      <DeadlineItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Dialog
            open={showWeeklyForm || !!editWeeklyTask}
            onOpenChange={(open) => !open && closeWeeklyForm()}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editWeeklyTask ? "Edit Weekly Task" : "Add Weekly Task"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleWeeklySubmit} className="space-y-4">
                <Input
                  placeholder="Task name (e.g., Grocery shop, Change sheets)"
                  value={weeklyTitle}
                  onChange={(e) => setWeeklyTitle(e.target.value)}
                  autoFocus
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={weeklyDescription}
                  onChange={(e) => setWeeklyDescription(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeWeeklyForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!weeklyTitle.trim()}>
                    {editWeeklyTask ? "Save" : "Add"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
