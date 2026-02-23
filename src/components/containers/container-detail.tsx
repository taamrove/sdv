"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Package, ScanBarcode } from "lucide-react";
import { ContainerFormDialog } from "./container-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  updateContainer,
  deleteContainer,
  unpackItem,
  packItemByHumanId,
} from "@/actions/containers";
import {
  CONTAINER_TYPE_LABELS,
  CONTAINER_STATUS_LABELS,
} from "@/lib/constants";
import { toast } from "sonner";
import { getFullName } from "@/lib/format-name";

// ---------------------------------------------------------------------------
// Status transition map (mirrors the server-side map)
// ---------------------------------------------------------------------------
const STATUS_TRANSITIONS: Record<string, string[]> = {
  EMPTY: ["PACKING"],
  PACKING: ["PACKED", "EMPTY"],
  PACKED: ["IN_TRANSIT", "PACKING"],
  IN_TRANSIT: ["AT_VENUE", "PACKED"],
  AT_VENUE: ["RETURNED", "IN_TRANSIT"],
  RETURNED: ["UNPACKED", "AT_VENUE"],
  UNPACKED: ["EMPTY"],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ContainerItem {
  id: string;
  packedAt: string;
  piece: {
    id: string;
    humanReadableId: string;
    status: string;
    condition: string;
    color: string | null;
    item: { name: string };
    category: { code: string; name: string };
    warehouseLocation: { label: string } | null;
  };
  packedBy: { id: string; firstName: string; lastName: string } | null;
}

interface ContainerData {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  notes: string | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
  items: ContainerItem[];
}

interface Project {
  id: string;
  name: string;
}

interface ContainerDetailProps {
  container: ContainerData;
  projects: Project[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ContainerDetail({
  container,
  projects,
}: ContainerDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nextStatus, setNextStatus] = useState<string>("");
  const [statusPending, startStatusTransition] = useTransition();

  // Scan-to-pack state
  const [scanValue, setScanValue] = useState("");
  const [packPending, startPackTransition] = useTransition();
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Unpack state
  const [unpackingItemId, setUnpackingItemId] = useState<string | null>(null);
  const [unpackLoading, setUnpackLoading] = useState(false);

  const validNextStatuses = STATUS_TRANSITIONS[container.status] ?? [];

  // ----------------------------------
  // Handlers
  // ----------------------------------
  function handleStatusUpdate() {
    if (!nextStatus) return;
    startStatusTransition(async () => {
      try {
        const result = await updateContainer(container.id, {
          status: nextStatus as "EMPTY" | "PACKING" | "PACKED" | "IN_TRANSIT" | "AT_VENUE" | "RETURNED" | "UNPACKED",
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`Status updated to ${CONTAINER_STATUS_LABELS[nextStatus] ?? nextStatus}`);
        setNextStatus("");
        router.refresh();
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  function handlePackItem() {
    const value = scanValue.trim();
    if (!value) return;

    startPackTransition(async () => {
      try {
        const result = await packItemByHumanId(container.id, value);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`Packed item ${value.toUpperCase()}`);
        setScanValue("");
        router.refresh();
      } catch {
        toast.error("Failed to pack item");
      } finally {
        scanInputRef.current?.focus();
      }
    });
  }

  async function handleUnpack() {
    if (!unpackingItemId) return;
    setUnpackLoading(true);
    try {
      const result = await unpackItem(unpackingItemId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Item unpacked");
        router.refresh();
      }
    } catch {
      toast.error("Failed to unpack item");
    } finally {
      setUnpackLoading(false);
      setUnpackingItemId(null);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = await deleteContainer(container.id);
      if ("error" in result) {
        toast.error(result.error);
        setDeleteLoading(false);
        setDeleteOpen(false);
        return;
      }
      toast.success("Container deleted");
      router.push("/containers");
      router.refresh();
    } catch {
      toast.error("Failed to delete container");
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">
            Items ({container.items.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Overview Tab                                                  */}
        {/* ============================================================ */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Container Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Name</span>
                    <p className="font-medium">{container.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {CONTAINER_TYPE_LABELS[container.type] ?? container.type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <StatusBadge
                        status={container.status}
                        label={CONTAINER_STATUS_LABELS[container.status]}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Project</span>
                    <p className="font-medium">
                      {container.project ? (
                        <Link
                          href={`/projects/${container.project.id}`}
                          className="hover:underline"
                        >
                          {container.project.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Items</span>
                    <div className="mt-1 flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{container.items.length}</span>
                    </div>
                  </div>
                </div>

                {container.description && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{container.description}</p>
                  </div>
                )}

                {container.notes && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground">Notes</span>
                    <p className="text-sm mt-1">{container.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Management Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status Management</CardTitle>
              </CardHeader>
              <CardContent>
                {validNextStatuses.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <Select
                      value={nextStatus}
                      onValueChange={setNextStatus}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select next status" />
                      </SelectTrigger>
                      <SelectContent>
                        {validNextStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {CONTAINER_STATUS_LABELS[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={!nextStatus || statusPending}
                    >
                      {statusPending ? "Updating..." : "Update Status"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No status transitions available from{" "}
                    {CONTAINER_STATUS_LABELS[container.status] ?? container.status}.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            {container.items.length === 0 && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Delete this container</p>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* Items Tab                                                     */}
        {/* ============================================================ */}
        <TabsContent value="items">
          <div className="space-y-6">
            {/* Scan to Pack */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanBarcode className="h-5 w-5" />
                  Scan to Pack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    ref={scanInputRef}
                    placeholder="Enter or scan item ID..."
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handlePackItem();
                      }
                    }}
                    className="max-w-sm font-mono"
                    autoFocus
                  />
                  <Button
                    onClick={handlePackItem}
                    disabled={!scanValue.trim() || packPending}
                  >
                    {packPending ? "Packing..." : "Pack"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Packed Items Table */}
            {container.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No items packed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the scanner above to pack items into this container.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Piece ID</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Packed By</TableHead>
                      <TableHead>Packed At</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {container.items.map((ci) => (
                      <TableRow key={ci.id}>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {ci.piece.humanReadableId}
                          </span>
                        </TableCell>
                        <TableCell>{ci.piece.item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ci.piece.category.code} - {ci.piece.category.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ci.piece.condition} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {ci.packedBy ? getFullName(ci.packedBy) : "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(ci.packedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setUnpackingItemId(ci.id)}
                          >
                            Unpack
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* Dialogs                                                       */}
      {/* ============================================================ */}
      <ContainerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        container={{
          id: container.id,
          name: container.name,
          type: container.type,
          description: container.description,
          notes: container.notes,
          projectId: container.projectId,
        }}
        projects={projects}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Container"
        description={`Are you sure you want to delete "${container.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      <ConfirmDialog
        open={!!unpackingItemId}
        onOpenChange={(open) => {
          if (!open) setUnpackingItemId(null);
        }}
        title="Unpack Item"
        description="Are you sure you want to unpack this item from the container?"
        confirmLabel="Unpack"
        variant="destructive"
        onConfirm={handleUnpack}
        loading={unpackLoading}
      />
    </>
  );
}
