"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createWarehouse, updateWarehouse } from "@/actions/warehouses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().max(300).optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
}

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
}: WarehouseFormDialogProps) {
  const router = useRouter();
  const isEditing = !!warehouse;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", address: "", description: "" },
  });

  useEffect(() => {
    if (open && warehouse) {
      form.reset({
        name: warehouse.name,
        address: warehouse.address ?? "",
        description: warehouse.description ?? "",
      });
    } else if (open && !warehouse) {
      form.reset({ name: "", address: "", description: "" });
    }
  }, [open, warehouse, form]);

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const result = await updateWarehouse(warehouse.id, {
          name: data.name,
          address: data.address || null,
          description: data.description || null,
        });
        if ("error" in result) { toast.error(result.error); return; }
        toast.success("Warehouse updated");
      } else {
        const result = await createWarehouse({
          name: data.name,
          address: data.address || undefined,
          description: data.description || undefined,
        });
        if ("error" in result) { toast.error(result.error); return; }
        toast.success("Warehouse created");
      }
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Warehouse" : "New Warehouse"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="wh-name">Name *</Label>
            <Input
              id="wh-name"
              placeholder="e.g., Main Warehouse"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="wh-address">Address</Label>
            <Input
              id="wh-address"
              placeholder="e.g., Storgata 1, Oslo"
              {...form.register("address")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wh-description">Description</Label>
            <Textarea
              id="wh-description"
              placeholder="Optional notes..."
              {...form.register("description")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
