"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { assignPerformer } from "@/actions/projects";
import { PERFORMER_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Performer {
  id: string;
  name: string;
  type: string;
}

interface AddPerformerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  performers: Performer[];
  assignedPerformerIds: string[];
}

export function AddPerformerDialog({
  open,
  onOpenChange,
  projectId,
  performers,
  assignedPerformerIds,
}: AddPerformerDialogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const available = performers.filter(
    (p) =>
      !assignedPerformerIds.includes(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(performerId: string) {
    setSubmitting(true);
    try {
      const result = await assignPerformer(projectId, performerId, role || undefined);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Performer added");
      setSearch("");
      setRole("");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Performer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role (optional)</Label>
            <Input
              placeholder="e.g., Lead dancer, Backup vocalist"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Search performers</Label>
            <Input
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No available performers found.
              </p>
            ) : (
              available.map((performer) => (
                <div
                  key={performer.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{performer.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {PERFORMER_TYPE_LABELS[performer.type] ?? performer.type}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleAdd(performer.id)}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
