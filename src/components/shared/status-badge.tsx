import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  // Piece statuses
  AVAILABLE: "default",
  ASSIGNED: "secondary",
  PACKED: "secondary",
  IN_USE: "default",
  MAINTENANCE: "destructive",
  RETIRED: "outline",
  LOST: "destructive",
  // Project statuses
  PLANNING: "outline",
  CONFIRMED: "default",
  PACKING: "secondary",
  IN_TRANSIT: "secondary",
  ACTIVE: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
  // Maintenance statuses
  REPORTED: "outline",
  ASSESSED: "secondary",
  IN_PROGRESS: "default",
  AWAITING_PARTS: "secondary",
  // History actions
  CREATED: "default",
  UPDATED: "secondary",
  STATUS_CHANGED: "secondary",
  ASSIGNED_TO_BOOKING: "secondary",
  REMOVED_FROM_BOOKING: "outline",
  CHECKED_OUT: "default",
  CHECKED_IN: "default",
  LOCATION_CHANGED: "secondary",
  MAINTENANCE_STARTED: "destructive",
  MAINTENANCE_COMPLETED: "default",
  CONDITION_CHANGED: "secondary",
  CROSSLOADED: "secondary",
  QUARANTINE_STARTED: "destructive",
  QUARANTINE_ENDED: "default",
  CHECKED_IN_TO_INVENTORY: "default",
  SENT_TO_MAINTENANCE: "destructive",
  // Severity
  MINOR: "outline",
  MODERATE: "secondary",
  UNUSABLE: "destructive",
  // Booking statuses
  DRAFT: "outline",
  PARTIALLY_FULFILLED: "secondary",
  FULFILLED: "default",
  // Container statuses (some overlap with project/piece)
  EMPTY: "outline",
  AT_VENUE: "default",
  RETURNED: "secondary",
  UNPACKED: "outline",
  // Quarantine types
  NONE: "outline",
  AUTO: "secondary",
  MANUAL: "default",
  // Condition
  NEW: "default",
  EXCELLENT: "default",
  GOOD: "secondary",
  FAIR: "outline",
  POOR: "destructive",
  // Priority
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
  // Feedback statuses
  OPEN: "outline",
  IN_REVIEW: "secondary",
  PLANNED: "default",
  RESOLVED: "default",
  CLOSED: "secondary",
  // Feedback categories
  BUG: "destructive",
  FEATURE_REQUEST: "default",
  IMPROVEMENT: "secondary",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? "outline";
  return <Badge variant={variant}>{label ?? status}</Badge>;
}
