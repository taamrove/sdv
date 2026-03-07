"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityState {
  status?: string;
  condition?: string;
  warehouseLocationId?: string | null;
  [key: string]: unknown;
}

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  details: string | null;
  previousState: ActivityState | null;
  newState: ActivityState | null;
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
  locationLabels: Record<string, string>; // id → label
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

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  condition: "Condition",
  warehouseLocationId: "Location",
};

function formatValue(
  key: string,
  value: unknown,
  locationLabels: Record<string, string>
): string {
  if (value == null) return "—";
  if (key === "warehouseLocationId") {
    return locationLabels[value as string] ?? String(value);
  }
  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildChanges(
  prev: ActivityState | null,
  next: ActivityState | null,
  locationLabels: Record<string, string>
) {
  const changes: { field: string; label: string; from: string; to: string }[] = [];
  if (!prev && next) {
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (next[key] != null) {
        changes.push({ field: key, label, from: "", to: formatValue(key, next[key], locationLabels) });
      }
    }
  } else if (prev && next) {
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (prev[key] !== next[key]) {
        changes.push({
          field: key,
          label,
          from: formatValue(key, prev[key], locationLabels),
          to: formatValue(key, next[key], locationLabels),
        });
      }
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Inline diff (compact, for feed rows)
// ---------------------------------------------------------------------------

function InlineDiff({
  entry,
  locationLabels,
}: {
  entry: ActivityEntry;
  locationLabels: Record<string, string>;
}) {
  const changes = buildChanges(entry.previousState, entry.newState, locationLabels);
  if (changes.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5">
      {changes.map(({ field, label, from, to }) => (
        <div key={field} className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground/70">{label}:</span>
          {from ? (
            <>
              <span className="line-through opacity-50">{from}</span>
              <span className="opacity-30">→</span>
            </>
          ) : (
            <span className="opacity-40 text-[10px]">set to</span>
          )}
          <span className="font-medium text-foreground">{to}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail sheet (popup)
// ---------------------------------------------------------------------------

function ActivityDetailSheet({
  entry,
  locationLabels,
  open,
  onOpenChange,
}: {
  entry: ActivityEntry | null;
  locationLabels: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  const changes = buildChanges(entry.previousState, entry.newState, locationLabels);
  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
  const actionColor = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionColor}`}
            >
              {actionLabel}
            </span>
            <span className="font-mono">{entry.item.humanReadableId}</span>
          </SheetTitle>
          <SheetDescription>{entry.item.product.name}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 text-sm">
          {/* Meta */}
          <div className="space-y-1.5 rounded-md border p-3 bg-muted/30">
            <Row label="Time">
              {new Date(entry.createdAt).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Row>
            {entry.performedBy && (
              <Row label="By">
                {entry.performedBy.firstName} {entry.performedBy.lastName}
              </Row>
            )}
            {entry.details && <Row label="Notes">{entry.details}</Row>}
          </div>

          {/* Changes */}
          {changes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {entry.previousState ? "What changed" : "Initial state"}
              </h4>
              <div className="space-y-2 rounded-md border p-3">
                {changes.map(({ field, label, from, to }) => (
                  <div key={field} className="flex items-start gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</span>
                    <div className="flex items-center gap-1.5 flex-wrap text-sm">
                      {from ? (
                        <>
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs line-through text-red-600 dark:text-red-400">
                            {from}
                          </span>
                          <span className="text-muted-foreground text-xs">→</span>
                        </>
                      ) : null}
                      <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                        {to}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full state snapshots */}
          {(entry.previousState || entry.newState) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Full snapshot
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {entry.previousState && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Before</p>
                    <pre className="rounded bg-muted p-2 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(entry.previousState).map(([k, v]) => [
                            k === "warehouseLocationId" ? "location" : k,
                            k === "warehouseLocationId"
                              ? (locationLabels[v as string] ?? v)
                              : v,
                          ])
                        ),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
                {entry.newState && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {entry.previousState ? "After" : "State"}
                    </p>
                    <pre className="rounded bg-muted p-2 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(entry.newState).map(([k, v]) => [
                            k === "warehouseLocationId" ? "location" : k,
                            k === "warehouseLocationId"
                              ? (locationLabels[v as string] ?? v)
                              : v,
                          ])
                        ),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Link to item */}
          <Link
            href={`/inventory/${entry.item.productId}/items/${entry.item.id}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open item {entry.item.humanReadableId}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const INITIAL_COUNT = 5;

export function ActivityFeed({ entries, locationLabels }: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<ActivityEntry | null>(null);

  const visible = expanded ? entries : entries.slice(0, INITIAL_COUNT);
  const hiddenCount = entries.length - INITIAL_COUNT;

  return (
    <>
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
              {visible.map((entry, i) => {
                const isLast = i === visible.length - 1 && hiddenCount === 0;
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                const actionColor = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground";

                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelected(entry)}
                    className={`w-full text-left flex items-start gap-3 text-sm py-3 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer ${!isLast ? "border-b" : ""}`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap ${actionColor}`}
                    >
                      {actionLabel}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold">
                          {entry.item.humanReadableId}
                        </span>
                        <span className="text-muted-foreground text-xs opacity-50">—</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {entry.item.product.name}
                        </span>
                      </div>

                      <InlineDiff entry={entry} locationLabels={locationLabels} />

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span>
                          {new Date(entry.createdAt).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {entry.performedBy && (
                          <>
                            <span className="opacity-40">·</span>
                            <span>
                              {entry.performedBy.firstName} {entry.performedBy.lastName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {entries.length > INITIAL_COUNT && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded((e) => !e)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                      Show {hiddenCount} more
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityDetailSheet
        entry={selected}
        locationLabels={locationLabels}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
