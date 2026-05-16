import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { SyncState } from "@/lib/types";

interface SyncIndicatorProps {
  syncState: SyncState;
}

export function SyncIndicator({ syncState }: SyncIndicatorProps) {
  if (syncState.hasPendingWrites) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving
      </span>
    );
  }

  if (syncState.fromCache) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CloudOff className="h-3 w-3" />
        Updating
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Cloud className="h-3 w-3" />
      Synced
    </span>
  );
}
