"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { updateFeedback, deleteFeedback } from "@/actions/feedback";
import { getFullName } from "@/lib/format-name";
import { Search, Trash2, StickyNote, Bug, Lightbulb, Sparkles } from "lucide-react";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
} from "@/lib/constants";

interface FeedbackItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  devNotes: string | null;
  createdAt: string;
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FeedbackAdminListProps {
  feedback: FeedbackItem[];
  pagination: PaginationData;
}

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  BUG: Bug,
  FEATURE_REQUEST: Lightbulb,
  IMPROVEMENT: Sparkles,
};

export function FeedbackAdminList({ feedback, pagination }: FeedbackAdminListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") ?? "all");
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notesTarget, setNotesTarget] = useState<FeedbackItem | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  function applyFilters() {
    const sp = new URLSearchParams(searchParams.toString());
    if (search) sp.set("search", search);
    else sp.delete("search");
    if (statusFilter !== "all") sp.set("status", statusFilter);
    else sp.delete("status");
    if (categoryFilter !== "all") sp.set("category", categoryFilter);
    else sp.delete("category");
    sp.set("page", "1");
    router.push(`?${sp.toString()}`);
  }

  function handleFilterChange(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (search) sp.set("search", search);
    else sp.delete("search");

    if (key === "status") {
      if (value !== "all") sp.set("status", value);
      else sp.delete("status");
      setStatusFilter(value);
    }
    if (key === "category") {
      if (value !== "all") sp.set("category", value);
      else sp.delete("category");
      setCategoryFilter(value);
    }

    sp.set("page", "1");
    router.push(`?${sp.toString()}`);
  }

  async function handleStatusChange(item: FeedbackItem, newStatus: string) {
    const result = await updateFeedback(item.id, { status: newStatus as "OPEN" | "IN_REVIEW" | "PLANNED" | "RESOLVED" | "CLOSED" });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Status updated to ${FEEDBACK_STATUS_LABELS[newStatus]}`);
      router.refresh();
    }
  }

  async function handlePriorityChange(item: FeedbackItem, newPriority: string) {
    const result = await updateFeedback(item.id, { priority: newPriority as "LOW" | "MEDIUM" | "HIGH" });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Priority updated to ${FEEDBACK_PRIORITY_LABELS[newPriority]}`);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteFeedback(deleteTarget.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Feedback deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete feedback");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleSaveNotes() {
    if (!notesTarget) return;
    setSavingNotes(true);
    try {
      const result = await updateFeedback(notesTarget.id, { devNotes: notesValue });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Notes saved");
        setNotesTarget(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex gap-2 flex-1 min-w-[200px] max-w-sm">
              <Input
                placeholder="Search feedback..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
              />
              <Button variant="outline" size="icon" onClick={applyFilters}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => handleFilterChange("status", v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => handleFilterChange("category", v)}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feedback</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No feedback found
                  </TableCell>
                </TableRow>
              ) : (
                feedback.map((item) => {
                  const Icon = CATEGORY_ICONS[item.category] ?? Sparkles;
                  const date = new Date(item.createdAt);

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[250px]">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={item.category}
                          label={FEEDBACK_CATEGORY_LABELS[item.category]}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.status}
                          onValueChange={(v) => handleStatusChange(item, v)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.priority}
                          onValueChange={(v) => handlePriorityChange(item, v)}
                        >
                          <SelectTrigger className="h-7 w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getFullName(item.submittedBy)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNotesTarget(item);
                              setNotesValue(item.devNotes ?? "");
                            }}
                            title="Dev notes"
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <Pagination {...pagination} />
        </CardContent>
      </Card>

      {/* Dev Notes Dialog */}
      <Dialog
        open={!!notesTarget}
        onOpenChange={(open) => {
          if (!open) setNotesTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dev Notes</DialogTitle>
            <DialogDescription>
              {notesTarget?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Internal notes about this feedback..."
              rows={5}
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Feedback"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
