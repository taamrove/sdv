"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, ArrowUpDown, X, HelpCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SizeMatchIndicatorProps {
  matchType: "exact" | "flex" | "mismatch" | "unknown";
  details?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MATCH_CONFIG = {
  exact: {
    label: "Exact",
    icon: Check,
    badgeClass:
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  },
  flex: {
    label: "Flex",
    icon: ArrowUpDown,
    badgeClass:
      "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  },
  mismatch: {
    label: "Mismatch",
    icon: X,
    badgeClass:
      "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    badgeClass:
      "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800",
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SizeMatchIndicator({
  matchType,
  details,
}: SizeMatchIndicatorProps) {
  const config = MATCH_CONFIG[matchType];
  const Icon = config.icon;

  const badge = (
    <Badge variant="outline" className={`gap-1 ${config.badgeClass}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );

  if (!details) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{details}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
