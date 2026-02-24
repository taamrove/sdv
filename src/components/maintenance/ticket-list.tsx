"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Wrench,
  Camera,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
} from "@/lib/constants";
import { getFullName } from "@/lib/format-name";

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: Date;
  item: {
    id: string;
    humanReadableId: string;
    product: { name: string };
    category: { name: string };
  };
  reportedBy: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  _count: { photos: number; comments: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TicketListProps {
  tickets: Ticket[];
  pagination: Pagination;
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TicketList({ tickets, pagination }: TicketListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyFilters(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        sp.set(key, value);
      } else {
        sp.delete(key);
      }
    }
    // Reset to page 1 when changing filters
    if (!("page" in params)) {
      sp.delete("page");
    }
    router.push(`?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ status: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(MAINTENANCE_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("priority") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ priority: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {Object.entries(MAINTENANCE_PRIORITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search tickets..."
          className="w-[250px]"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            // Debounce-like: apply on Enter or when cleared
            if (val === "") {
              applyFilters({ search: "" });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              applyFilters({ search: (e.target as HTMLInputElement).value });
            }
          }}
        />
      </div>

      {/* Ticket cards */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No maintenance tickets found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a ticket to start tracking repairs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/maintenance/${ticket.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base leading-snug pr-2">
                    {ticket.title}
                  </CardTitle>
                  <StatusBadge
                    status={ticket.status}
                    label={
                      MAINTENANCE_STATUS_LABELS[ticket.status] ?? ticket.status
                    }
                  />
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={ticket.priority}
                        label={
                          MAINTENANCE_PRIORITY_LABELS[ticket.priority] ??
                          ticket.priority
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-mono text-xs">
                        {ticket.item.humanReadableId}
                      </span>
                      <span>{ticket.item.product.name}</span>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {ticket.item.category.name}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground pt-0">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.assignedTo ? getFullName(ticket.assignedTo) : "Unassigned"}
                      </div>
                      <span>{formatRelativeTime(ticket.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {ticket._count.photos > 0 && (
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {ticket._count.photos}
                        </div>
                      )}
                      {ticket._count.comments > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {ticket._count.comments}
                        </div>
                      )}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() =>
              applyFilters({ page: String(pagination.page - 1) })
            }
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              applyFilters({ page: String(pagination.page + 1) })
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
