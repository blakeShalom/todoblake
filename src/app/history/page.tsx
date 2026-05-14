"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { useHistory, TimeFilter } from "@/lib/hooks/use-history";
import { SlotType } from "@/lib/types";

const FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

type SlotFilter = "all" | SlotType | "daily";

const SLOT_LABELS: Record<SlotType, string> = {
  essential: "Essential",
  priority: "Priority",
  outcome: "Outcome",
  backlog: "Backlog",
};

const SLOT_FILTER_OPTIONS: { value: SlotFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "essential", label: "Essential" },
  { value: "priority", label: "Priority" },
  { value: "outcome", label: "Outcome" },
  { value: "backlog", label: "Backlog" },
  { value: "daily", label: "Daily" },
];

export default function HistoryPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all");
  const { items, dailyCompletions, loading } = useHistory(timeFilter);

  const filtered = items.filter((item) => {
    if (slotFilter === "all") return true;
    if (slotFilter === "daily") return false;
    return item.slot === slotFilter;
  });

  const showDaily = slotFilter === "all" || slotFilter === "daily";
  const totalCount = (slotFilter === "daily" ? 0 : filtered.length) +
    (showDaily ? dailyCompletions.length : 0);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Completed</h1>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={timeFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {SLOT_FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={slotFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlotFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : totalCount === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No completed items in this time range.
            </p>
          ) : (
            <div className="space-y-1.5">
              {slotFilter !== "daily" &&
                filtered.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="flex-1 text-sm text-muted-foreground line-through">
                      {item.title}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {SLOT_LABELS[item.slot]}
                    </Badge>
                    {item.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {format(item.completedAt.toDate(), "MMM d, h:mm a")}
                      </span>
                    )}
                  </div>
                ))}
              {showDaily &&
                dailyCompletions.map((dc) => (
                  <div
                    key={dc.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="flex-1 text-sm text-muted-foreground line-through">
                      {dc.taskTitle}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Daily
                    </Badge>
                    {dc.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {format(dc.completedAt.toDate(), "MMM d, h:mm a")}
                      </span>
                    )}
                  </div>
                ))}
              <p className="pt-2 text-center text-xs text-muted-foreground">
                {totalCount} item{totalCount !== 1 ? "s" : ""} completed
              </p>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
