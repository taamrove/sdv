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
  createCategorySchema,
  type CreateCategoryInput,
} from "@/lib/validators/category";
import { createCategory, updateCategory } from "@/actions/categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSuccess?: (category: { id: string; code: string; name: string }) => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const isEditing = !!category;

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      code: category?.code ?? "",
      name: category?.name ?? "",
      description: category?.description ?? "",
    },
  });

  // Reset form when category changes
  if (open && category && form.getValues("code") !== category.code) {
    form.reset({
      code: category.code,
      name: category.name,
      description: category.description ?? "",
    });
  }
  if (open && !category && form.getValues("code") !== "") {
    form.reset({ code: "", name: "", description: "" });
  }

  async function onSubmit(data: CreateCategoryInput) {
    try {
      if (isEditing) {
        const result = await updateCategory(category.id, {
          name: data.name,
          description: data.description,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Category updated");
      } else {
        const result = await createCategory(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Category created");
        if (onSuccess && "data" in result && result.data) {
          const created = result.data as { id: string; code: string; name: string };
          onSuccess({ id: created.id, code: created.code, name: created.name });
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
            {isEditing ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="C"
                maxLength={1}
                className="w-20 font-mono uppercase"
                {...form.register("code", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Costume"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              {...form.register("description")}
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
