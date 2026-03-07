"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
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

export interface ActivityEntry {
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

interface ActivityLogProps {
  entries: ActivityEntry[];
  locationLabels: Record<string, string>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
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
  ASSIGNED_TO_BOOKING: "Booked",
  REMOVED_FROM_BOOKING: "Unbooked",
  PACKED: "Packed",
  UNPACKED: "Unpacked",
  CHECKED_OUT: "Checked out",
  CHECKED_IN: "Checked in",
  CHECKED_IN_TO_INVENTORY: "Back in inventory",
  LOCATION_CHANGED: "Location changed",
  SENT_TO_MAINTENANCE: "Sent to maintenance",
  MAINTENANCE_STARTED: "Maintenance started",
  MAINTENANCE_COMPLETED: "Maintenance done",
  CONDITION_CHANGED: "Condition changed",
  QUARANTINE_STARTED: "Quarantined",
  QUARANTINE_ENDED: "Quarantine ended",
  RETIRED: "Retired",
  LOST: "Lost",
  FOUND: "Found",
  CROSSLOADED: "Crossloaded",
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-green-500/15 text-green-700 dark:text-green-400",
  UPDATED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  STATUS_CHANGED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ASSIGNED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  RETURNED: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  MAINTENANCE: "bg-red-500/15 text-red-700 dark:text-red-400",
  ASSIGNED_TO_BOOKING: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  REMOVED_FROM_BOOKING: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  PACKED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  UNPACKED: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  CHECKED_OUT: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  CHECKED_IN: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  CHECKED_IN_TO_INVENTORY: "bg-green-500/15 text-green-700 dark:text-green-400",
  LOCATION_CHANGED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  SENT_TO_MAINTENANCE: "bg-red-500/15 text-red-700 dark:text-red-400",
  MAINTENANCE_STARTED: "bg-red-500/15 text-red-700 dark:text-red-400",
  MAINTENANCE_COMPLETED: "bg-green-500/15 text-green-700 dark:text-green-400",
  CONDITION_CHANGED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  QUARANTINE_STARTED: "bg-red-500/15 text-red-700 dark:text-red-400",
  QUARANTINE_ENDED: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  RETIRED: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  LOST: "bg-red-500/15 text-red-700 dark:text-red-400",
  FOUND: "bg-green-500/15 text-green-700 dark:text-green-400",
  CROSSLOADED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  condition: "Condition",
  warehouseLocationId: "Location",
  color: "Color",
  notes: "Notes",
};

function fmt(key: string, value: unknown, locationLabels: Record<string, string>): string {
  if (value == null) return "—";
  if (key === "warehouseLocationId") return locationLabels[value as string] ?? String(value);
  return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildChanges(
  prev: ActivityState | null,
  next: ActivityState | null,
  locationLabels: Record<string, string>
) {
  const changes: { field: string; label: string; from: string; to: string }[] = [];
  if (!prev && next) {
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (next[key] != null)
        changes.push({ field: key, label, from: "", to: fmt(key, next[key], locationLabels) });
    }
  } else if (prev && next) {
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (prev[key] !== next[key])
        changes.push({ field: key, label, from: fmt(key, prev[key], locationLabels), to: fmt(key, next[key], locationLabels) });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

function DetailSheet({
  entry,
  locationLabels,
  open,
  onOpenChange,
}: {
  entry: ActivityEntry | null;
  locationLabels: Record<string, string>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
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
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionColor}`}>
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
                weekday: "short", day: "numeric", month: "short",
                year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </Row>
            {entry.performedBy && (
              <Row label="By">{entry.performedBy.firstName} {entry.performedBy.lastName}</Row>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {from && (
                        <>
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs line-through text-red-600 dark:text-red-400">{from}</span>
                          <span className="text-muted-foreground text-xs">→</span>
                        </>
                      )}
                      <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">{to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full snapshot */}
          {(entry.previousState || entry.newState) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Full snapshot</h4>
              <div className="grid grid-cols-2 gap-2">
                {entry.previousState && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Before</p>
                    <pre className="rounded bg-muted p-2 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(Object.fromEntries(Object.entries(entry.previousState).map(([k, v]) => [
                        k === "warehouseLocationId" ? "location" : k,
                        k === "warehouseLocationId" ? (locationLabels[v as string] ?? v) : v,
                      ])), null, 2)}
                    </pre>
                  </div>
                )}
                {entry.newState && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{entry.previousState ? "After" : "State"}</p>
                    <pre className="rounded bg-muted p-2 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(Object.fromEntries(Object.entries(entry.newState).map(([k, v]) => [
                        k === "warehouseLocationId" ? "location" : k,
                        k === "warehouseLocationId" ? (locationLabels[v as string] ?? v) : v,
                      ])), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

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
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityLog({ entries, locationLabels, pagination }: ActivityLogProps) {
  const [selected, setSelected] = useState<ActivityEntry | null>(null);

  return (
    <>
      <div className="rounded-md border divide-y">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          entries.map((entry) => {
            const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
            const actionColor = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground";
            const changes = buildChanges(entry.previousState, entry.newState, locationLabels);

            return (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap ${actionColor}`}>
                  {actionLabel}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{entry.item.humanReadableId}</span>
                    <span className="text-xs text-muted-foreground truncate">{entry.item.product.name}</span>
                  </div>
                  {changes.length > 0 && (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {changes.map(({ field, label, from, to }) => (
                        <span key={field} className="text-xs text-muted-foreground">
                          {label}:{" "}
                          {from && <span className="line-through opacity-50">{from} </span>}
                          <span className="text-foreground">{to}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>
                    {new Date(entry.createdAt).toLocaleString("en-GB", {
                      day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                  {entry.performedBy && (
                    <div className="opacity-60">{entry.performedBy.firstName}</div>
                  )}
                </div>

                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 -rotate-90" />
              </button>
            );
          })
        )}
      </div>

      <Pagination {...pagination} />

      <DetailSheet
        entry={selected}
        locationLabels={locationLabels}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Compact inline variant — for embedding on item / product / performer pages
// ---------------------------------------------------------------------------

interface CompactActivityLogProps {
  entries: ActivityEntry[];
  locationLabels: Record<string, string>;
  defaultVisible?: number;
}

export function CompactActivityLog({
  entries,
  locationLabels,
  defaultVisible = 5,
}: CompactActivityLogProps) {
  const [selected, setSelected] = useState<ActivityEntry | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-1">No history yet.</p>;
  }

  const visible = showAll ? entries : entries.slice(0, defaultVisible);
  const remaining = entries.length - defaultVisible;

  return (
    <>
      <div className="space-y-px">
        {visible.map((entry) => {
          const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
          const actionColor = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground";
          const changes = buildChanges(entry.previousState, entry.newState, locationLabels);

          return (
            <button
              key={entry.id}
              onClick={() => setSelected(entry)}
              className="w-full text-left flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded hover:bg-muted/50 transition-colors group"
            >
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap ${actionColor}`}>
                {actionLabel}
              </span>

              <div className="flex-1 min-w-0 flex items-center gap-x-2 flex-wrap">
                {changes.length > 0 ? (
                  changes.map(({ field, label, from, to }) => (
                    <span key={field} className="text-xs text-muted-foreground">
                      {label}:{" "}
                      {from && <span className="line-through opacity-40">{from} </span>}
                      <span className="text-foreground font-medium">{to}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString("en-GB", {
                  day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
                {entry.performedBy && (
                  <span className="ml-1 opacity-60">· {entry.performedBy.firstName}</span>
                )}
              </span>

              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground -rotate-90 opacity-0 group-hover:opacity-40 transition-opacity" />
            </button>
          );
        })}
      </div>

      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Show {remaining} more…
        </button>
      )}

      <DetailSheet
        entry={selected}
        locationLabels={locationLabels}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
