"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Package } from "lucide-react";
import { LocationFormDialog } from "./location-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteWarehouseLocation } from "@/actions/warehouse";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Location {
  id: string;
  zone: string;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  label: string;
  description: string | null;
  _count: { pieces: number };
}

interface LocationListProps {
  locations: Location[];
}

export function WarehouseLocationList({ locations }: LocationListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const result = await deleteWarehouseLocation(deleting.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Location deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete location");
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No locations yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add warehouse locations to organize your inventory.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">
                  <Badge variant="outline" className="font-mono text-sm">
                    {loc.label}
                  </Badge>
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditing(loc); setFormOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(loc)}
                    disabled={loc._count.pieces > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-3 w-3" />
                  {loc._count.pieces} pieces
                </div>
                {loc.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {loc.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Location"
        description={`Are you sure you want to delete "${deleting?.label}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  );
}
