"use client";

import { format } from "date-fns";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { SlotSection } from "@/components/todo/slot-section";
import { DailyTaskItem } from "@/components/todo/daily-task-item";
import { useTodayItems } from "@/lib/hooks/use-today-items";
import { useDailyTasks } from "@/lib/hooks/use-daily-tasks";
import { useAuth } from "@/components/auth/auth-provider";
import { toggleDailyTaskCompletion } from "@/lib/firebase/firestore";

export default function TodayPage() {
  const today = new Date();
  const { getSlotItems, loading } = useTodayItems(today);
  const { tasks, isCompleted, getCompletionId, loading: tasksLoading } = useDailyTasks(today);
  const { user } = useAuth();
  const dateStr = format(today, "yyyy-MM-dd");

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
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
