export const APP_NAME = "SDV Lager";

export const DEFAULT_CATEGORIES = [
  { code: "C", name: "Costume", description: "Full costumes and dresses" },
  { code: "S", name: "Shoes", description: "All types of footwear" },
  { code: "H", name: "Hat", description: "Hats and headwear" },
  { code: "A", name: "Accessories", description: "Belts, gloves, scarves, etc." },
  { code: "J", name: "Jewelry", description: "Necklaces, earrings, bracelets, etc." },
  { code: "P", name: "Props", description: "Stage props and hand-held items" },
] as const;

export const PIECE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  PACKED: "Packed",
  IN_USE: "In Use",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
  LOST: "Lost",
};

export const PIECE_CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const PERFORMER_TYPE_LABELS: Record<string, string> = {
  DANCER: "Dancer",
  VOCALIST: "Vocalist",
  MUSICIAN: "Musician",
  ACROBAT: "Acrobat",
  ACTOR: "Actor",
  OTHER: "Other",
};

export const CONTAINER_TYPE_LABELS: Record<string, string> = {
  SUITCASE: "Suitcase",
  BAG: "Bag",
  BOX: "Box",
  GARMENT_BAG: "Garment Bag",
  SHOE_BOX: "Shoe Box",
  HAT_BOX: "Hat Box",
  CUSTOM: "Custom",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  CONFIRMED: "Confirmed",
  PACKING: "Packing",
  IN_TRANSIT: "In Transit",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIALLY_FULFILLED: "Partially Fulfilled",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reported",
  ASSESSED: "Assessed",
  IN_PROGRESS: "In Progress",
  AWAITING_PARTS: "Awaiting Parts",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const MAINTENANCE_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const MAINTENANCE_SEVERITY_LABELS: Record<string, string> = {
  MINOR: "Minor (usable)",
  MODERATE: "Moderate",
  UNUSABLE: "Unusable",
};

export const QUARANTINE_TYPE_LABELS: Record<string, string> = {
  NONE: "None",
  AUTO: "Automatic",
  MANUAL: "Manual Override",
};

export const CONTAINER_STATUS_LABELS: Record<string, string> = {
  EMPTY: "Empty",
  PACKING: "Packing",
  PACKED: "Packed",
  IN_TRANSIT: "In Transit",
  AT_VENUE: "At Venue",
  RETURNED: "Returned",
  UNPACKED: "Unpacked",
};

export const SIZE_FLEX_DIRECTION_LABELS: Record<string, string> = {
  UP: "Size Up",
  DOWN: "Size Down",
  BOTH: "Up or Down",
};
