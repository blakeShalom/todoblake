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

const SLOT_LABELS: Record<SlotType, string> = {
  essential: "Essential",
  priority: "Priority",
  outcome: "Outcome",
  backlog: "Backlog",
};

export default function HistoryPage() {
  const [filter, setFilter] = useState<TimeFilter>("24h");
  const { items, loading } = useHistory(filter);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Completed</h1>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={filter === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No completed items in this time range.
            </p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => (
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
              <p className="pt-2 text-center text-xs text-muted-foreground">
                {items.length} item{items.length !== 1 ? "s" : ""} completed
              </p>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
