"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { SIZE_MODE_LABELS } from "@/lib/constants";
import { createSubCategory, updateSubCategory } from "@/actions/sub-categories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SubCategory {
  id: string;
  name: string;
  sizeMode: string | null;
  order: number;
}

interface SubCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  subCategory?: SubCategory | null;
}

export function SubCategoryFormDialog({
  open,
  onOpenChange,
  categoryId,
  subCategory,
}: SubCategoryFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sizeMode, setSizeMode] = useState<string>("none");
  const [loading, setLoading] = useState(false);

  const isEditing = !!subCategory;

  useEffect(() => {
    if (open) {
      setName(subCategory?.name ?? "");
      setSizeMode(subCategory?.sizeMode ?? "none");
    }
  }, [open, subCategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const mode = sizeMode === "none" ? null : sizeMode;
      const result = isEditing
        ? await updateSubCategory(subCategory.id, name, mode)
        : await createSubCategory(categoryId, name, mode);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isEditing ? "Sub-category updated" : "Sub-category created");
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Sub-Category" : "Add Sub-Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sub-name">Name *</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jacket, Boots, Headpiece"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sizeMode">Size type</Label>
            <Select value={sizeMode} onValueChange={setSizeMode}>
              <SelectTrigger id="sizeMode">
                <SelectValue placeholder="No sizing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No sizing</SelectItem>
                {Object.entries(SIZE_MODE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls which size fields appear when adding items of this type.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : isEditing ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
