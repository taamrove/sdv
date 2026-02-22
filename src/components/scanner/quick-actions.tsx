"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { packItemByHumanId, unpackItem } from "@/actions/containers";
import {
  CONTAINER_TYPE_LABELS,
  PIECE_STATUS_LABELS,
} from "@/lib/constants";
import { toast } from "sonner";
import type { ScannedPiece } from "@/components/scanner/scan-result-card";
import {
  PackageOpen,
  Package,
  Wrench,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PackableContainer {
  id: string;
  name: string;
  type: string;
  status: string;
  projectName: string | null;
  itemCount: number;
}

interface QuickActionsProps {
  piece: ScannedPiece;
  containers: PackableContainer[];
  onActionComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickActions({
  piece,
  containers,
  onActionComplete,
}: QuickActionsProps) {
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [isPacking, setIsPacking] = useState(false);
  const [isUnpacking, setIsUnpacking] = useState(false);

  async function handlePack() {
    if (!selectedContainerId) {
      toast.error("Please select a container");
      return;
    }

    setIsPacking(true);
    try {
      const result = await packItemByHumanId(
        selectedContainerId,
        piece.humanReadableId
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Packed ${piece.humanReadableId} into container`
      );
      setSelectedContainerId("");
      onActionComplete();
    } catch {
      toast.error("Failed to pack piece");
    } finally {
      setIsPacking(false);
    }
  }

  async function handleUnpack(containerItemId: string) {
    setIsUnpacking(true);
    try {
      const result = await unpackItem(containerItemId);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Unpacked ${piece.humanReadableId}`
      );
      onActionComplete();
    } catch {
      toast.error("Failed to unpack piece");
    } finally {
      setIsUnpacking(false);
    }
  }

  // -------------------------------------------------------------------------
  // AVAILABLE or ASSIGNED: Show pack action
  // -------------------------------------------------------------------------
  if (piece.status === "AVAILABLE" || piece.status === "ASSIGNED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Pack into Container
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {containers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No containers available for packing. Create a container first.
            </p>
          ) : (
            <>
              <Select
                value={selectedContainerId}
                onValueChange={setSelectedContainerId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a container..." />
                </SelectTrigger>
                <SelectContent>
                  {containers.map((container) => (
                    <SelectItem key={container.id} value={container.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{container.name}</span>
                        <span className="text-muted-foreground">
                          {CONTAINER_TYPE_LABELS[container.type] ?? container.type}
                        </span>
                        {container.projectName && (
                          <span className="text-muted-foreground">
                            - {container.projectName}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          ({container.itemCount} pieces)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handlePack}
                disabled={!selectedContainerId || isPacking}
                className="w-full"
              >
                {isPacking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Package className="size-4" />
                )}
                {isPacking ? "Packing..." : "Pack"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // PACKED: Show unpack action
  // -------------------------------------------------------------------------
  if (piece.status === "PACKED") {
    const activeContainerItem = piece.containerItems[0];

    if (!activeContainerItem) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" />
              Packed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Piece is marked as packed but no container assignment found.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="size-4" />
            Currently Packed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Container: </span>
              <Link
                href={`/containers/${activeContainerItem.container.id}`}
                className="font-medium text-primary hover:underline"
              >
                {activeContainerItem.container.name}
              </Link>
            </p>
            {activeContainerItem.container.project && (
              <p>
                <span className="text-muted-foreground">Project: </span>
                <span className="font-medium">
                  {activeContainerItem.container.project.name}
                </span>
              </p>
            )}
          </div>
          <Button
            onClick={() => handleUnpack(activeContainerItem.id)}
            disabled={isUnpacking}
            variant="destructive"
            className="w-full"
          >
            {isUnpacking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PackageOpen className="size-4" />
            )}
            {isUnpacking ? "Unpacking..." : "Unpack"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // MAINTENANCE: Show info with link
  // -------------------------------------------------------------------------
  if (piece.status === "MAINTENANCE") {
    const ticket = piece.maintenanceTickets[0];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4" />
            In Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticket ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <p className="font-medium">{ticket.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={ticket.status} label={ticket.status} />
                  <StatusBadge status={ticket.priority} label={ticket.priority} />
                </div>
              </div>
              <Link href={`/maintenance/${ticket.id}`}>
                <Button variant="outline" className="w-full">
                  <Wrench className="size-4" />
                  View Ticket
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Piece is in maintenance but no active ticket was found.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // IN_USE: Read-only info
  // -------------------------------------------------------------------------
  if (piece.status === "IN_USE") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Currently in Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This piece is currently in use and cannot be modified.
          </p>
          <div className="mt-2">
            <StatusBadge
              status={piece.status}
              label={PIECE_STATUS_LABELS[piece.status] ?? piece.status}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // RETIRED: Warning
  // -------------------------------------------------------------------------
  if (piece.status === "RETIRED") {
    return (
      <Card className="border-yellow-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="size-4" />
            Piece Retired
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This piece has been retired and is no longer in active inventory.
          </p>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // LOST: Warning
  // -------------------------------------------------------------------------
  if (piece.status === "LOST") {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" />
            Piece Marked as Lost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This piece is marked as lost. If found, update its status in inventory
            management.
          </p>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Fallback for unknown statuses
  // -------------------------------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          No actions available for status:{" "}
          <StatusBadge
            status={piece.status}
            label={PIECE_STATUS_LABELS[piece.status] ?? piece.status}
          />
        </p>
      </CardContent>
    </Card>
  );
}
