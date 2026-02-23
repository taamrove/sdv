"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangelogFormDialog } from "./changelog-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteChangelogEntry } from "@/actions/changelog";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  changes: string;
  buildId: string | null;
  createdAt: string;
}

interface ChangelogListProps {
  entries: ChangelogEntry[];
  canManage: boolean;
}

export function ChangelogList({ entries, canManage }: ChangelogListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ChangelogEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteChangelogEntry(deleteId);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Entry deleted");
      router.refresh();
    }
    setDeleteId(null);
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditEntry(null); setFormOpen(true); }}>
            <Plus className="mr-2 size-4" />
            Add Version
          </Button>
        </div>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No changelog entries yet.
            {canManage && " Click \"Add Version\" to create the first one."}
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

          {entries.map((entry, idx) => {
            const date = new Date(entry.createdAt);

            return (
              <div key={entry.id} className="relative flex gap-4 pb-8 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 mt-1.5 flex size-10 shrink-0 items-center justify-center rounded-full border bg-background">
                  <span className="text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                </div>

                {/* Content */}
                <Card className="flex-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {entry.title}
                          </CardTitle>
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.version}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <span>
                            {date.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {entry.buildId && (
                            <a
                              href={`https://github.com/taamrove/sdv/commit/${entry.buildId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs opacity-50 hover:opacity-100 hover:underline transition-opacity"
                            >
                              {entry.buildId}
                            </a>
                          )}
                        </CardDescription>
                      </div>

                      {canManage && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditEntry(entry);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteId(entry.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {entry.changes.split("\n").map((line, i) => {
                        if (line.startsWith("- ")) {
                          return (
                            <div key={i} className="flex gap-2 py-0.5">
                              <span className="text-muted-foreground shrink-0">
                                &bull;
                              </span>
                              <span>{line.slice(2)}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("### ")) {
                          return (
                            <h4
                              key={i}
                              className="mt-3 mb-1 text-sm font-semibold"
                            >
                              {line.slice(4)}
                            </h4>
                          );
                        }
                        if (line.trim() === "") return <div key={i} className="h-2" />;
                        return <p key={i} className="py-0.5">{line}</p>;
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <>
          <ChangelogFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            entry={editEntry}
          />
          <ConfirmDialog
            open={!!deleteId}
            onOpenChange={(open) => !open && setDeleteId(null)}
            title="Delete changelog entry"
            description="This will permanently remove this changelog entry."
            onConfirm={handleDelete}
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
