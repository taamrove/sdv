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
  createThemeSchema,
  type CreateThemeInput,
} from "@/lib/validators/theme";
import { createTheme, updateTheme } from "@/actions/themes";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Theme {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface ThemeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme?: Theme | null;
}

export function ThemeFormDialog({
  open,
  onOpenChange,
  theme,
}: ThemeFormDialogProps) {
  const router = useRouter();
  const isEditing = !!theme;

  const form = useForm<CreateThemeInput>({
    resolver: zodResolver(createThemeSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: undefined,
    },
  });

  useEffect(() => {
    if (open && theme) {
      form.reset({
        name: theme.name,
        description: theme.description ?? "",
        imageUrl: theme.imageUrl ?? undefined,
      });
    } else if (open && !theme) {
      form.reset({ name: "", description: "", imageUrl: undefined });
    }
  }, [open, theme, form]);

  async function onSubmit(data: CreateThemeInput) {
    try {
      if (isEditing) {
        const result = await updateTheme(theme.id, {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Theme updated");
      } else {
        const result = await createTheme(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Theme created");
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
            {isEditing ? "Edit Theme" : "New Theme"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Carnival Tropicale"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              {...form.register("description")}
            />
          </div>
          <div className="space-y-2">
            <Label>Theme Image</Label>
            <ImageUpload
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url ?? undefined)}
              folder="themes"
            />
          </div>
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
