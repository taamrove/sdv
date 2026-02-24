"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { ImageUpload } from "@/components/shared/image-upload";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_SEVERITY_LABELS,
  QUARANTINE_TYPE_LABELS,
} from "@/lib/constants";
import {
  updateTicket,
  completeTicket,
  addComment,
  addPhoto,
  removePhoto,
  overrideQuarantine,
} from "@/actions/maintenance";
import {
  Wrench,
  Camera,
  MessageSquare,
  Clock,
  User,
  X,
  Send,
  Save,
  ExternalLink,
  ShieldOff,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFullName } from "@/lib/format-name";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: { id: string; firstName: string; lastName: string };
}

interface TicketItem {
  id: string;
  humanReadableId: string;
  status: string;
  product: { id: string; name: string };
  category: { id: string; name: string };
  warehouseLocation: { id: string; label: string } | null;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string | null;
  estimatedCompletion: Date | string | null;
  completedAt: Date | string | null;
  quarantineEndsAt: Date | string | null;
  quarantineType: string;
  createdAt: Date | string;
  item: TicketItem;
  reportedBy: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  photos: Photo[];
  comments: Comment[];
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface TicketDetailProps {
  ticket: Ticket;
  users: UserOption[];
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const STATUS_TRANSITIONS: Record<
  string,
  { next: string; label: string; variant: "default" | "secondary" | "destructive" }[]
> = {
  REPORTED: [
    { next: "ASSESSED", label: "Mark as Assessed", variant: "default" },
    { next: "CANCELLED", label: "Cancel Ticket", variant: "destructive" },
  ],
  ASSESSED: [
    { next: "IN_PROGRESS", label: "Start Work", variant: "default" },
    { next: "CANCELLED", label: "Cancel Ticket", variant: "destructive" },
  ],
  IN_PROGRESS: [
    { next: "AWAITING_PARTS", label: "Awaiting Parts", variant: "secondary" },
    { next: "COMPLETED", label: "Mark Complete", variant: "default" },
  ],
  AWAITING_PARTS: [
    { next: "IN_PROGRESS", label: "Resume Work", variant: "default" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TicketDetail({ ticket, users }: TicketDetailProps) {
  const router = useRouter();

  // Workflow button loading
  const [workflowLoading, setWorkflowLoading] = useState(false);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    next: string;
    label: string;
  } | null>(null);

  // Comments
  const [commentContent, setCommentContent] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Photo removal
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [removePhotoLoading, setRemovePhotoLoading] = useState(false);

  // Quarantine override
  const [showQuarantineOverride, setShowQuarantineOverride] = useState(false);
  const [quarantineOverrideLoading, setQuarantineOverrideLoading] = useState(false);

  // Sidebar quick controls
  const [sidebarStatus, setSidebarStatus] = useState(ticket.status);
  const [sidebarPriority, setSidebarPriority] = useState(ticket.priority);
  const [sidebarAssignedTo, setSidebarAssignedTo] = useState(
    ticket.assignedTo?.id ?? "unassigned"
  );
  const [sidebarEstimatedCompletion, setSidebarEstimatedCompletion] = useState(
    toDateInputValue(ticket.estimatedCompletion)
  );
  const [sidebarSaving, setSidebarSaving] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleStatusTransition(nextStatus: string) {
    setWorkflowLoading(true);
    try {
      let result;
      if (nextStatus === "COMPLETED") {
        result = await completeTicket(ticket.id);
      } else {
        result = await updateTicket(ticket.id, { status: nextStatus as UpdateStatusType });
      }

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          `Ticket ${MAINTENANCE_STATUS_LABELS[nextStatus]?.toLowerCase() ?? nextStatus}`
        );
        router.refresh();
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setWorkflowLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleAddComment() {
    if (!commentContent.trim()) return;
    setCommentLoading(true);
    try {
      const result = await addComment(ticket.id, commentContent.trim());
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setCommentContent("");
        router.refresh();
      }
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleAddPhoto(url: string | null) {
    if (!url) return;
    try {
      const result = await addPhoto(ticket.id, url);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Photo added");
        router.refresh();
      }
    } catch {
      toast.error("Failed to add photo");
    }
  }

  async function handleRemovePhoto() {
    if (!removingPhotoId) return;
    setRemovePhotoLoading(true);
    try {
      const result = await removePhoto(removingPhotoId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Photo removed");
        router.refresh();
      }
    } catch {
      toast.error("Failed to remove photo");
    } finally {
      setRemovePhotoLoading(false);
      setRemovingPhotoId(null);
    }
  }

  async function handleQuarantineOverride() {
    setQuarantineOverrideLoading(true);
    try {
      const result = await overrideQuarantine(ticket.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Item released from quarantine");
        router.refresh();
      }
    } catch {
      toast.error("Failed to override quarantine");
    } finally {
      setQuarantineOverrideLoading(false);
      setShowQuarantineOverride(false);
    }
  }

  async function handleSaveSidebar() {
    setSidebarSaving(true);
    try {
      const data: Record<string, unknown> = {};

      if (sidebarStatus !== ticket.status) {
        data.status = sidebarStatus;
      }
      if (sidebarPriority !== ticket.priority) {
        data.priority = sidebarPriority;
      }

      const currentAssignedId = ticket.assignedTo?.id ?? "unassigned";
      if (sidebarAssignedTo !== currentAssignedId) {
        data.assignedToId =
          sidebarAssignedTo === "unassigned" ? null : sidebarAssignedTo;
      }

      const currentEstimated = toDateInputValue(ticket.estimatedCompletion);
      if (sidebarEstimatedCompletion !== currentEstimated) {
        data.estimatedCompletion = sidebarEstimatedCompletion || null;
      }

      if (Object.keys(data).length === 0) {
        toast.info("No changes to save");
        setSidebarSaving(false);
        return;
      }

      // If status is being set to COMPLETED, use completeTicket instead
      if (data.status === "COMPLETED") {
        const result = await completeTicket(ticket.id);
        if ("error" in result) {
          toast.error(result.error);
          setSidebarSaving(false);
          return;
        }
        // If there are other changes beyond status, apply those too
        const otherData = { ...data };
        delete otherData.status;
        if (Object.keys(otherData).length > 0) {
          await updateTicket(ticket.id, otherData as UpdateData);
        }
      } else {
        const result = await updateTicket(ticket.id, data as UpdateData);
        if ("error" in result) {
          toast.error(result.error);
          setSidebarSaving(false);
          return;
        }
      }

      toast.success("Ticket updated");
      router.refresh();
    } catch {
      toast.error("Failed to update ticket");
    } finally {
      setSidebarSaving(false);
    }
  }

  // Type helper for updateTicket calls
  type UpdateStatusType =
    | "REPORTED"
    | "ASSESSED"
    | "IN_PROGRESS"
    | "AWAITING_PARTS"
    | "COMPLETED"
    | "CANCELLED";
  type UpdateData = Parameters<typeof updateTicket>[1];

  const transitions = STATUS_TRANSITIONS[ticket.status] ?? [];
  const needsConfirm = (next: string) =>
    next === "COMPLETED" || next === "CANCELLED";

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={ticket.status}
                  label={
                    MAINTENANCE_STATUS_LABELS[ticket.status] ?? ticket.status
                  }
                />
                <StatusBadge
                  status={ticket.priority}
                  label={
                    MAINTENANCE_PRIORITY_LABELS[ticket.priority] ??
                    ticket.priority
                  }
                />
                {ticket.severity && (
                  <StatusBadge
                    status={ticket.severity}
                    label={
                      MAINTENANCE_SEVERITY_LABELS[ticket.severity] ??
                      ticket.severity
                    }
                  />
                )}
              </div>

              <p className="text-muted-foreground">
                {ticket.description || "No description"}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/inventory/${ticket.item.id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="font-mono">
                      {ticket.item.humanReadableId}
                    </span>
                    <span>{ticket.item.product.name}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Reported by {getFullName(ticket.reportedBy)} on{" "}
                    {formatDate(ticket.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Assigned to{" "}
                    {ticket.assignedTo ? getFullName(ticket.assignedTo) : "Unassigned"}
                  </span>
                </div>
                {ticket.estimatedCompletion && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Estimated completion:{" "}
                      {formatDate(ticket.estimatedCompletion)}
                    </span>
                  </div>
                )}
                {ticket.completedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Completed: {formatDate(ticket.completedAt)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section B: Status Workflow Buttons */}
          {transitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {transitions.map((transition) => (
                    <Button
                      key={transition.next}
                      variant={transition.variant}
                      disabled={workflowLoading}
                      onClick={() => {
                        if (needsConfirm(transition.next)) {
                          setConfirmAction(transition);
                        } else {
                          handleStatusTransition(transition.next);
                        }
                      }}
                    >
                      {transition.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section B2: Quarantine Info */}
          {ticket.quarantineEndsAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Quarantine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Quarantine until:{" "}
                    </span>
                    <span className="font-medium">
                      {formatDate(ticket.quarantineEndsAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Days remaining:{" "}
                    </span>
                    <span className="font-medium">
                      {(() => {
                        const end =
                          typeof ticket.quarantineEndsAt === "string"
                            ? new Date(ticket.quarantineEndsAt)
                            : ticket.quarantineEndsAt;
                        if (!end) return 0;
                        const diffMs = end.getTime() - new Date().getTime();
                        return Math.max(0, Math.ceil(diffMs / 86400000));
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Type: </span>
                    <StatusBadge
                      status={ticket.quarantineType}
                      label={
                        QUARANTINE_TYPE_LABELS[ticket.quarantineType] ??
                        ticket.quarantineType
                      }
                    />
                  </div>
                </div>

                {/* Only show override if quarantine is still active */}
                {(() => {
                  const end =
                    typeof ticket.quarantineEndsAt === "string"
                      ? new Date(ticket.quarantineEndsAt)
                      : ticket.quarantineEndsAt;
                  return end && end.getTime() > Date.now();
                })() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuarantineOverride(true)}
                  >
                    <ShieldOff className="mr-1 h-3 w-3" />
                    Override Quarantine
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section C: Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos ({ticket.photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ticket.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <Image
                        src={photo.url}
                        alt={photo.caption ?? "Maintenance photo"}
                        width={300}
                        height={200}
                        className="rounded-lg border object-cover w-full aspect-[3/2]"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setRemovingPhotoId(photo.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {photo.caption && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Add Photo
                </Label>
                <ImageUpload
                  value={null}
                  onChange={handleAddPhoto}
                  folder="maintenance"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section D: Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({ticket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length > 0 ? (
                <div className="space-y-4">
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-md border px-4 py-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {getFullName(comment.user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No comments yet.
                </p>
              )}

              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  disabled={!commentContent.trim() || commentLoading}
                  onClick={handleAddComment}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-6">
          {/* Quick Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={sidebarStatus}
                  onValueChange={setSidebarStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAINTENANCE_STATUS_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={sidebarPriority}
                  onValueChange={setSidebarPriority}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAINTENANCE_PRIORITY_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={sidebarAssignedTo}
                  onValueChange={setSidebarAssignedTo}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getFullName(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estimated Completion</Label>
                <Input
                  type="date"
                  value={sidebarEstimatedCompletion}
                  onChange={(e) =>
                    setSidebarEstimatedCompletion(e.target.value)
                  }
                />
              </div>

              <Button
                className="w-full"
                disabled={sidebarSaving}
                onClick={handleSaveSidebar}
              >
                <Save className="mr-2 h-4 w-4" />
                {sidebarSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Item Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Link
                href={`/inventory/${ticket.item.id}`}
                className="text-primary hover:underline flex items-center gap-1"
              >
                View Item
                <ExternalLink className="h-3 w-3" />
              </Link>
              <div>
                <span className="text-muted-foreground">ID: </span>
                <span className="font-mono">
                  {ticket.item.humanReadableId}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Product: </span>
                <span>{ticket.item.product.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Category: </span>
                <Badge variant="outline" className="text-xs">
                  {ticket.item.category.name}
                </Badge>
              </div>
              {ticket.item.warehouseLocation && (
                <div>
                  <span className="text-muted-foreground">Location: </span>
                  <span>{ticket.item.warehouseLocation.label}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Status: </span>
                <StatusBadge status={ticket.item.status} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm dialog for complete/cancel actions */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.next === "COMPLETED"
            ? "Complete Ticket"
            : "Cancel Ticket"
        }
        description={
          confirmAction?.next === "COMPLETED"
            ? "Are you sure you want to mark this ticket as complete? The item will be returned to available status."
            : "Are you sure you want to cancel this ticket? The item will be returned to available status."
        }
        confirmLabel={confirmAction?.label ?? "Confirm"}
        variant={
          confirmAction?.next === "CANCELLED" ? "destructive" : "default"
        }
        onConfirm={() => {
          if (confirmAction) {
            handleStatusTransition(confirmAction.next);
          }
        }}
        loading={workflowLoading}
      />

      {/* Confirm dialog for photo removal */}
      <ConfirmDialog
        open={!!removingPhotoId}
        onOpenChange={(open) => !open && setRemovingPhotoId(null)}
        title="Remove Photo"
        description="Are you sure you want to remove this photo?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemovePhoto}
        loading={removePhotoLoading}
      />

      {/* Confirm dialog for quarantine override */}
      <ConfirmDialog
        open={showQuarantineOverride}
        onOpenChange={setShowQuarantineOverride}
        title="Override Quarantine"
        description="Release this item from quarantine early? The item will be returned to available status immediately."
        confirmLabel="Release"
        variant="default"
        onConfirm={handleQuarantineOverride}
        loading={quarantineOverrideLoading}
      />
    </>
  );
}
