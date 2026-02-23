"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FeatureFlagFormDialog } from "@/components/admin/feature-flag-form-dialog";
import { FeatureFlagBetaUsers } from "@/components/admin/feature-flag-beta-users";
import {
  deleteFeatureFlag,
  updateFeatureFlag,
} from "@/actions/feature-flags";
import { Plus, Pencil, Trash2, Users, ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  stage: "DEVELOPMENT" | "ALPHA" | "BETA" | "PRODUCTION";
  createdAt: string;
  updatedAt: string;
  _count: { betaUsers: number };
}

interface FeatureFlagListProps {
  flags: FeatureFlag[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGE_BADGE_VARIANT: Record<
  FeatureFlag["stage"],
  "outline" | "destructive" | "secondary" | "default"
> = {
  DEVELOPMENT: "outline",
  ALPHA: "destructive",
  BETA: "secondary",
  PRODUCTION: "default",
};

const STAGE_OPTIONS: FeatureFlag["stage"][] = ["DEVELOPMENT", "ALPHA", "BETA", "PRODUCTION"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureFlagList({ flags }: FeatureFlagListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureFlag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [betaUsersFlag, setBetaUsersFlag] = useState<FeatureFlag | null>(null);

  function handleCreate() {
    setEditingFlag(null);
    setFormOpen(true);
  }

  function handleEdit(flag: FeatureFlag) {
    setEditingFlag(flag);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteFeatureFlag(deleteTarget.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Feature flag "${deleteTarget.key}" has been deleted`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete feature flag");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleStageChange(
    flag: FeatureFlag,
    stage: FeatureFlag["stage"]
  ) {
    try {
      const result = await updateFeatureFlag(flag.id, { stage });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Stage updated to ${stage}`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update stage");
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div />
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Flag
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Beta Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No feature flags found
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                        {flag.key}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{flag.name}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto gap-1 p-0"
                          >
                            <Badge variant={STAGE_BADGE_VARIANT[flag.stage]}>
                              {flag.stage}
                            </Badge>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {STAGE_OPTIONS.map((stage) => (
                            <DropdownMenuItem
                              key={stage}
                              onClick={() => handleStageChange(flag, stage)}
                              disabled={stage === flag.stage}
                            >
                              <Badge
                                variant={STAGE_BADGE_VARIANT[stage]}
                                className="mr-2"
                              >
                                {stage}
                              </Badge>
                              {stage === flag.stage && "(current)"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>{flag._count.betaUsers}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {flag.stage === "BETA" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBetaUsersFlag(flag)}
                            title="Manage beta users"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(flag)}
                          title="Edit flag"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(flag)}
                          title="Delete flag"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FeatureFlagFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        flag={editingFlag}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Feature Flag"
        description={`Are you sure you want to delete "${deleteTarget?.key}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <FeatureFlagBetaUsers
        open={!!betaUsersFlag}
        onOpenChange={(open) => {
          if (!open) setBetaUsersFlag(null);
        }}
        flag={betaUsersFlag}
      />
    </>
  );
}
