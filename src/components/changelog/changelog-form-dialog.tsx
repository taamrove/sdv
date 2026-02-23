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
  createChangelogEntry,
  updateChangelogEntry,
} from "@/actions/changelog";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  changes: string;
  buildId: string | null;
}

interface ChangelogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ChangelogEntry | null;
}

export function ChangelogFormDialog({
  open,
  onOpenChange,
  entry,
}: ChangelogFormDialogProps) {
  const router = useRouter();
  const isEdit = !!entry;

  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [changes, setChanges] = useState("");
  const [buildId, setBuildId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setVersion(entry?.version ?? "");
      setTitle(entry?.title ?? "");
      setChanges(entry?.changes ?? "");
      setBuildId(entry?.buildId ?? "");
    }
  }, [open, entry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        version,
        title,
        changes,
        buildId: buildId || null,
      };

      const result = isEdit
        ? await updateChangelogEntry(entry.id, data)
        : await createChangelogEntry(data);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "Entry updated" : "Entry created");
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Changelog Entry" : "New Changelog Entry"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the version information."
              : "Add a new version entry to the changelog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cl-version">Version</Label>
              <Input
                id="cl-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 0.2.0"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cl-buildId">Build ID (optional)</Label>
              <Input
                id="cl-buildId"
                value={buildId}
                onChange={(e) => setBuildId(e.target.value)}
                placeholder="e.g. b0d0c56"
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cl-title">Title</Label>
            <Input
              id="cl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dark Mode & Stage Badges"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cl-changes">Changes</Label>
            <Textarea
              id="cl-changes"
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder={"- Added dark mode\n- Stage badges in sidebar\n- Removed version number"}
              rows={8}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use &quot;- &quot; for bullet points, &quot;### &quot; for section headers.
            </p>
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
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
