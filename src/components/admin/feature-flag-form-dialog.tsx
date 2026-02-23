"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFeatureFlag,
  updateFeatureFlag,
} from "@/actions/feature-flags";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  stage: "DEVELOPMENT" | "ALPHA" | "BETA" | "PRODUCTION";
}

interface FeatureFlagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: FeatureFlag | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureFlagFormDialog({
  open,
  onOpenChange,
  flag,
}: FeatureFlagFormDialogProps) {
  const router = useRouter();
  const isEditing = !!flag;

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<"DEVELOPMENT" | "ALPHA" | "BETA" | "PRODUCTION">("DEVELOPMENT");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (flag) {
        setKey(flag.key);
        setName(flag.name);
        setDescription(flag.description ?? "");
        setStage(flag.stage);
      } else {
        setKey("");
        setName("");
        setDescription("");
        setStage("DEVELOPMENT");
      }
    }
  }, [open, flag]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        const result = await updateFeatureFlag(flag.id, {
          name,
          description: description || null,
          stage,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`Feature flag "${name}" updated successfully`);
      } else {
        const result = await createFeatureFlag({
          key,
          name,
          description: description || undefined,
          stage,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`Feature flag "${name}" created successfully`);
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Feature Flag" : "Create Feature Flag"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the feature flag settings below."
                : "Fill in the details to create a new feature flag."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="flag-key">Key</Label>
              <Input
                id="flag-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="my-feature-flag"
                required
                disabled={isEditing}
                pattern="^[a-z0-9-]+$"
                title="Lowercase alphanumeric with hyphens only"
              />
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only. Cannot be
                  changed after creation.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Feature Flag"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="flag-description">Description</Label>
              <Textarea
                id="flag-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="flag-stage">Stage</Label>
              <Select
                value={stage}
                onValueChange={(v) =>
                  setStage(v as "DEVELOPMENT" | "ALPHA" | "BETA" | "PRODUCTION")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVELOPMENT">Development (Developers only)</SelectItem>
                  <SelectItem value="ALPHA">Alpha (Admins only)</SelectItem>
                  <SelectItem value="BETA">
                    Beta (Admins + selected users)
                  </SelectItem>
                  <SelectItem value="PRODUCTION">
                    Production (Everyone)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Flag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
