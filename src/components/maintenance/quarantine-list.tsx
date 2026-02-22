"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MAINTENANCE_SEVERITY_LABELS } from "@/lib/constants";
import { overrideQuarantine } from "@/actions/maintenance";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuarantineTicket {
  id: string;
  severity: string | null;
  quarantineEndsAt: string;
  quarantineType: string;
  piece: {
    id: string;
    humanReadableId: string;
    item: { name: string };
    category: { name: string };
  };
}

interface QuarantineListProps {
  tickets: QuarantineTicket[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysRemaining(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuarantineList({ tickets }: QuarantineListProps) {
  const router = useRouter();
  const [overrideTicketId, setOverrideTicketId] = useState<string | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);

  async function handleOverride() {
    if (!overrideTicketId) return;

    setOverrideLoading(true);
    try {
      const result = await overrideQuarantine(overrideTicketId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Item released from quarantine");
        router.refresh();
      }
    } catch {
      toast.error("Failed to override quarantine");
    } finally {
      setOverrideLoading(false);
      setOverrideTicketId(null);
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No items in quarantine
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Piece ID</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Quarantine Until</TableHead>
            <TableHead>Days Remaining</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono">
                {ticket.piece.humanReadableId}
              </TableCell>
              <TableCell>{ticket.piece.item.name}</TableCell>
              <TableCell>{ticket.piece.category.name}</TableCell>
              <TableCell>
                {ticket.severity ? (
                  <StatusBadge
                    status={ticket.severity}
                    label={
                      MAINTENANCE_SEVERITY_LABELS[ticket.severity] ??
                      ticket.severity
                    }
                  />
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>{formatDate(ticket.quarantineEndsAt)}</TableCell>
              <TableCell>{daysRemaining(ticket.quarantineEndsAt)}d</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverrideTicketId(ticket.id)}
                >
                  <ShieldOff className="mr-1 h-3 w-3" />
                  Override
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!overrideTicketId}
        onOpenChange={(open) => !open && setOverrideTicketId(null)}
        title="Release from Quarantine"
        description="Release this item from quarantine early? The item will be returned to available status immediately."
        confirmLabel="Release"
        variant="default"
        onConfirm={handleOverride}
        loading={overrideLoading}
      />
    </>
  );
}
