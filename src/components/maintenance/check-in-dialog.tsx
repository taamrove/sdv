"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MAINTENANCE_SEVERITY_LABELS } from "@/lib/constants";
import { checkInPiece } from "@/actions/check-in";
import { Package, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckInDialogProps {
  piece: {
    id: string;
    humanReadableId: string;
    itemName: string;
  };
  locations: {
    id: string;
    label: string;
  }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckInDialog({
  piece,
  locations,
  open,
  onOpenChange,
}: CheckInDialogProps) {
  const router = useRouter();
  const [action, setAction] = useState<"INVENTORY" | "MAINTENANCE" | null>(
    null
  );
  const [warehouseLocationId, setWarehouseLocationId] = useState<string>("");
  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [maintenanceSeverity, setMaintenanceSeverity] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setAction(null);
    setWarehouseLocationId("");
    setMaintenanceTitle("");
    setMaintenanceSeverity("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!action) return;

    setSubmitting(true);
    try {
      const result = await checkInPiece({
        pieceId: piece.id,
        action,
        warehouseLocationId: warehouseLocationId || null,
        maintenanceTitle: maintenanceTitle || undefined,
        maintenanceSeverity:
          (maintenanceSeverity as "MINOR" | "MODERATE" | "UNUSABLE") ||
          undefined,
        notes: notes || undefined,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          action === "INVENTORY"
            ? "Piece checked in to inventory"
            : "Piece sent to maintenance"
        );
        resetForm();
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Check In Piece</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{piece.humanReadableId}</span>
            {" - "}
            {piece.itemName}
          </DialogDescription>
        </DialogHeader>

        {/* Action selection */}
        {!action && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Card
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => setAction("INVENTORY")}
            >
              <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
                <Package className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium text-center">
                  Check In to Inventory
                </span>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => setAction("MAINTENANCE")}
            >
              <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
                <Wrench className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium text-center">
                  Send to Maintenance
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory form */}
        {action === "INVENTORY" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="warehouseLocation">Warehouse Location</Label>
              <Select
                value={warehouseLocationId}
                onValueChange={setWarehouseLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Maintenance form */}
        {action === "MAINTENANCE" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceTitle">Issue Title *</Label>
              <Input
                id="maintenanceTitle"
                placeholder="e.g., Torn seam on left sleeve"
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={maintenanceSeverity}
                onValueChange={setMaintenanceSeverity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MAINTENANCE_SEVERITY_LABELS).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Minor issues don&apos;t remove item from availability
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenanceNotes">Notes</Label>
              <Textarea
                id="maintenanceNotes"
                placeholder="Optional description of the issue..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        {action && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                (action === "MAINTENANCE" && !maintenanceTitle.trim())
              }
            >
              {submitting
                ? "Submitting..."
                : action === "INVENTORY"
                  ? "Check In"
                  : "Send to Maintenance"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
