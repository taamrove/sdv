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
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, MapPin } from "lucide-react";
import { WarehouseFormDialog } from "./warehouse-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteWarehouse } from "@/actions/warehouses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  _count: { locations: number };
}

interface WarehouseListProps {
  warehouses: Warehouse[];
}

export function WarehouseList({ warehouses }: WarehouseListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const result = await deleteWarehouse(deleting.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Warehouse deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete warehouse");
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
          Add Warehouse
        </Button>
      </div>

      {warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <WarehouseIcon className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-medium">No warehouses yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add a warehouse to group your storage locations.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {warehouses.map((wh) => (
            <Card key={wh.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold leading-tight">
                  {wh.name}
                </CardTitle>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditing(wh); setFormOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(wh)}
                    disabled={wh._count.locations > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs font-normal">
                    {wh._count.locations} location{wh._count.locations !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {wh.address && (
                  <p className="text-xs text-muted-foreground">{wh.address}</p>
                )}
                {wh.description && (
                  <p className="text-sm text-muted-foreground mt-1">{wh.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        warehouse={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Warehouse"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  );
}
