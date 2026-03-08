"use client";

import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  action: string;
  userName: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date | string;
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
  DELETED: "Deleted",
  STATUS_CHANGED: "Status changed",
  ASSIGNED: "Assigned",
  RETURNED: "Returned",
  MAINTENANCE: "Sent to maintenance",
  LOCATION_CHANGED: "Location changed",
  CONDITION_CHANGED: "Condition changed",
  RETIRED: "Retired",
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-green-500/15 text-green-700 dark:text-green-400",
  UPDATED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  DELETED: "bg-red-500/15 text-red-700 dark:text-red-400",
  STATUS_CHANGED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ASSIGNED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  RETURNED: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  MAINTENANCE: "bg-red-500/15 text-red-700 dark:text-red-400",
  LOCATION_CHANGED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  CONDITION_CHANGED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  RETIRED: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

function getEntityLink(entry: ActivityEntry): string | null {
  const { entityType, entityId, details } = entry;
  if (entityType === "Item") {
    const productId = (details as Record<string, unknown> | null)?.productId as string | undefined;
    return productId ? `/inventory/${productId}/items/${entityId}` : null;
  }
  if (entityType === "Performer") return `/performers/${entityId}`;
  if (entityType === "Project") return `/projects/${entityId}`;
  if (entityType === "Product") return `/inventory/${entityId}`;
  if (entityType === "Contact") return `/contacts/${entityId}`;
  return null;
}

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
              const label = entry.entityLabel ?? entry.entityType;
              const href = getEntityLink(entry);

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
                      {href ? (
                        <Link
                          href={href}
                          className="font-mono text-xs font-semibold hover:underline"
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs font-semibold">{label}</span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.entityType}
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
                    {entry.userName && (
                      <div className="opacity-60">
                        {entry.userName.split(" ")[0]}
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
