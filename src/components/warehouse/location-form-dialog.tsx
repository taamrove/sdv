"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  createWarehouseLocationSchema,
  type CreateWarehouseLocationInput,
} from "@/lib/validators/warehouse";
import {
  createWarehouseLocation,
  updateWarehouseLocation,
} from "@/actions/warehouse";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Location {
  id: string;
  zone: string;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  label: string;
  description: string | null;
}

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
  onSuccess?: (location: { id: string; label: string }) => void;
}

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSuccess,
}: LocationFormDialogProps) {
  const router = useRouter();
  const isEditing = !!location;

  const form = useForm<CreateWarehouseLocationInput>({
    resolver: zodResolver(createWarehouseLocationSchema),
    defaultValues: {
      zone: "",
      rack: "",
      shelf: "",
      bin: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open && location) {
      form.reset({
        zone: location.zone,
        rack: location.rack ?? "",
        shelf: location.shelf ?? "",
        bin: location.bin ?? "",
        description: location.description ?? "",
      });
    } else if (open && !location) {
      form.reset({ zone: "", rack: "", shelf: "", bin: "", description: "" });
    }
  }, [open, location, form]);

  async function onSubmit(data: CreateWarehouseLocationInput) {
    try {
      if (isEditing) {
        const result = await updateWarehouseLocation(location.id, data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Location updated");
      } else {
        const result = await createWarehouseLocation(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Location created");
        if (onSuccess && "data" in result && result.data) {
          const created = result.data as { id: string; label: string };
          onSuccess({ id: created.id, label: created.label });
        }
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
          <DialogTitle>
            {isEditing ? "Edit Location" : "New Location"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zone">Zone *</Label>
              <Input
                id="zone"
                placeholder="e.g., A"
                {...form.register("zone")}
              />
              {form.formState.errors.zone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.zone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rack">Rack</Label>
              <Input
                id="rack"
                placeholder="e.g., R1"
                {...form.register("rack")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shelf">Shelf</Label>
              <Input
                id="shelf"
                placeholder="e.g., S3"
                {...form.register("shelf")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bin">Bin</Label>
              <Input
                id="bin"
                placeholder="e.g., B12"
                {...form.register("bin")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              {...form.register("description")}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Label will be auto-generated from zone, rack, shelf, and bin.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
