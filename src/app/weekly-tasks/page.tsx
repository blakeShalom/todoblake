"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { useWeeklyTasks } from "@/lib/hooks/use-weekly-tasks";
import { useAuth } from "@/components/auth/auth-provider";
import {
  addWeeklyTask,
  deleteWeeklyTask,
  toggleWeeklyTaskCompletion,
  updateWeeklyTask,
} from "@/lib/firebase/firestore";
import { WeeklyTask } from "@/lib/types";
import { WeeklyTaskItem } from "@/components/todo/weekly-task-item";

export default function WeeklyTasksPage() {
  const today = new Date();
  const { tasks, loading, weekStart, isCompleted, getCompletionId } =
    useWeeklyTasks(today);
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<WeeklyTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    await addWeeklyTask(user.uid, {
      title: title.trim(),
      description: description.trim(),
      sortOrder: tasks.length,
    });
    closeForm();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !editTask || !title.trim()) return;
    await updateWeeklyTask(user.uid, editTask.id, {
      title: title.trim(),
      description: description.trim(),
    });
    closeForm();
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteWeeklyTask(user.uid, id);
  }

  function openEdit(task: WeeklyTask) {
    setTitle(task.title);
    setDescription(task.description);
    setEditTask(task);
  }

  function closeForm() {
    setShowForm(false);
    setEditTask(null);
    setTitle("");
    setDescription("");
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Weekly Tasks</h1>
            <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Recurring chores that reset each week. Check them off once during the current week.
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <WeeklyTaskItem
                  key={task.id}
                  task={task}
                  completed={isCompleted(task.id)}
                  onToggle={() => {
                    if (!user) return;
                    toggleWeeklyTaskCompletion(
                      user.uid,
                      task.id,
                      weekStart,
                      getCompletionId(task.id)
                    );
                  }}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
              {tasks.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No weekly tasks yet. Add recurring chores to track each week.
                </p>
              )}
            </div>
          )}

          <Dialog open={showForm || !!editTask} onOpenChange={(v) => !v && closeForm()}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editTask ? "Edit Weekly Task" : "Add Weekly Task"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={editTask ? handleEdit : handleAdd} className="space-y-4">
                <Input
                  placeholder="Task name (e.g., Grocery shop, Change sheets)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!title.trim()}>
                    {editTask ? "Save" : "Add"}
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
