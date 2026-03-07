"use client";

import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  item: {
    id: string;
    humanReadableId: string;
    productId: string;
    product: { name: string };
  };
  performedBy: { firstName: string; lastName: string } | null;
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  STATUS_CHANGED: "Status changed",
  ASSIGNED: "Assigned",
  RETURNED: "Returned",
  MAINTENANCE: "Sent to maintenance",
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-green-500/15 text-green-700 dark:text-green-400",
  UPDATED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  STATUS_CHANGED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ASSIGNED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  RETURNED: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  MAINTENANCE: "bg-red-500/15 text-red-700 dark:text-red-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div>
            {entries.map((entry, i) => {
              const isLast = i === entries.length - 1;
              const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
              const actionColor = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground";

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 text-sm py-2.5 ${!isLast ? "border-b" : ""}`}
                >
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap ${actionColor}`}>
                    {actionLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/inventory/${entry.item.productId}/items/${entry.item.id}`}
                        className="font-mono text-xs font-semibold hover:underline"
                      >
                        {entry.item.humanReadableId}
                      </Link>
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.item.product.name}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground text-right">
                    <div>
                      {new Date(entry.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {entry.performedBy && (
                      <div className="opacity-60">
                        {entry.performedBy.firstName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <Link
              href="/activity"
              className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t"
            >
              View full history
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
