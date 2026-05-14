"use client";

import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { SlotSection } from "@/components/todo/slot-section";
import { DailyTaskItem } from "@/components/todo/daily-task-item";
import { useTodayItems } from "@/lib/hooks/use-today-items";
import { useDailyTasks } from "@/lib/hooks/use-daily-tasks";
import { useUpcomingDeadlines } from "@/lib/hooks/use-upcoming-deadlines";
import { useAuth } from "@/components/auth/auth-provider";
import { toggleDailyTaskCompletion } from "@/lib/firebase/firestore";
import { TodoItem } from "@/lib/types";

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
  const { next7Days, next8to30Days, loading: deadlinesLoading } = useUpcomingDeadlines();
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
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
