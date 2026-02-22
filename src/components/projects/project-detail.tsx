"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  AlertTriangle,
  Users,
  ShoppingBag,
  Package,
} from "lucide-react";
import { ProjectForm } from "./project-form";
import { AddPerformerDialog } from "./add-performer-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { removePerformer } from "@/actions/projects";
import {
  PROJECT_STATUS_LABELS,
  PERFORMER_TYPE_LABELS,
  BOOKING_STATUS_LABELS,
} from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingPiece {
  id: string;
  piece: {
    id: string;
    humanReadableId: string;
    status: string;
    item: { id: string; name: string };
    category: { id: string; code: string; name: string };
  };
}

interface Booking {
  id: string;
  status: string;
  notes: string | null;
  quantity: number;
  product: { id: string; name: string };
  pieces: BookingPiece[];
}

interface Assignment {
  id: string;
  role: string | null;
  performer: {
    id: string;
    name: string;
    email: string | null;
    type: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  status: string;
  notes: string | null;
  assignments: Assignment[];
  bookings: Booking[];
}

interface Theme {
  id: string;
  name: string;
}

interface PerformerOption {
  id: string;
  name: string;
  type: string;
}

interface ProjectDetailProps {
  project: Project;
  themes: Theme[];
  allPerformers: PerformerOption[];
  conflictPieceIds: string[];
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACTIVE":
    case "IN_TRANSIT":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
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

export function ProjectDetail({
  project,
  themes,
  allPerformers,
  conflictPieceIds,
}: ProjectDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [addPerformerOpen, setAddPerformerOpen] = useState(false);
  const [removingAssignment, setRemovingAssignment] = useState<Assignment | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const assignedPerformerIds = project.assignments.map((a) => a.performer.id);

  // Gather all pieces across bookings for the inventory tab
  const allPieces = project.bookings.flatMap((booking) =>
    booking.pieces.map((bp) => ({
      ...bp,
      productName: booking.product.name,
      bookingId: booking.id,
      hasConflict: conflictPieceIds.includes(bp.piece.id),
    }))
  );

  async function handleRemovePerformer() {
    if (!removingAssignment) return;
    setRemoveLoading(true);
    try {
      const result = await removePerformer(removingAssignment.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Performer removed");
        router.refresh();
      }
    } catch {
      toast.error("Failed to remove performer");
    } finally {
      setRemoveLoading(false);
      setRemovingAssignment(null);
    }
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setEditing(false)}>
          Cancel Edit
        </Button>
        <ProjectForm themes={themes} project={project} />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performers">
            Performers ({project.assignments.length})
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Bookings ({project.bookings.length})
          </TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory ({allPieces.length})
            {conflictPieceIds.length > 0 && (
              <AlertTriangle className="ml-1 h-3 w-3 text-destructive" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Project Details</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(project.status)}>
                    {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                  </Badge>
                </div>

                {project.description && (
                  <p className="text-muted-foreground">{project.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDate(project.startDate)}
                        {project.endDate && ` - ${formatDate(project.endDate)}`}
                      </span>
                    </div>
                  )}

                  {(project.venue || project.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {[project.venue, project.city, project.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {project.notes && (
                  <div>
                    <span className="text-sm font-medium">Notes:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {project.assignments.length} performer{project.assignments.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" />
                    {project.bookings.length} booking{project.bookings.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    {allPieces.length} piece{allPieces.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performers Tab */}
        <TabsContent value="performers">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAddPerformerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Performer
              </Button>
            </div>

            {project.assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No performers assigned</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add performers to this project.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {project.assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {assignment.performer.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {PERFORMER_TYPE_LABELS[assignment.performer.type] ??
                                assignment.performer.type}
                            </Badge>
                            {assignment.role && (
                              <span className="text-xs text-muted-foreground">
                                Role: {assignment.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemovingAssignment(assignment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <div className="space-y-4">
            {project.bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No bookings yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Bookings are created to reserve products for this project.
                </p>
              </div>
            ) : (
              project.bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">
                          {booking.product.name}
                        </CardTitle>
                        <Badge variant="outline">
                          {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                        </Badge>
                        {booking.quantity > 1 && (
                          <Badge variant="secondary">x{booking.quantity}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {booking.pieces.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No pieces assigned yet.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {booking.pieces.map((bp) => (
                          <div
                            key={bp.id}
                            className="flex items-center gap-2 text-sm rounded-md border px-3 py-2"
                          >
                            <span className="font-mono">
                              {bp.piece.humanReadableId}
                            </span>
                            <span>{bp.piece.item.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {bp.piece.category.name}
                            </Badge>
                            {conflictPieceIds.includes(bp.piece.id) && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Conflict
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {booking.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {booking.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="space-y-4">
            {conflictPieceIds.length > 0 && (
              <Card className="border-destructive">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">
                      Scheduling Conflicts Detected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {conflictPieceIds.length} piece{conflictPieceIds.length !== 1 ? "s are" : " is"}{" "}
                      assigned to other projects with overlapping dates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {allPieces.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No inventory pieces</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pieces are assigned through bookings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allPieces.map((bp) => (
                  <div
                    key={bp.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                      bp.hasConflict ? "border-destructive bg-destructive/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono">{bp.piece.humanReadableId}</span>
                      <span className="font-medium">{bp.piece.item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {bp.piece.category.name}
                      </Badge>
                      <span className="text-muted-foreground">
                        in {bp.productName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {bp.piece.status}
                      </Badge>
                      {bp.hasConflict && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Conflict
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddPerformerDialog
        open={addPerformerOpen}
        onOpenChange={setAddPerformerOpen}
        projectId={project.id}
        performers={allPerformers}
        assignedPerformerIds={assignedPerformerIds}
      />

      <ConfirmDialog
        open={!!removingAssignment}
        onOpenChange={(open) => !open && setRemovingAssignment(null)}
        title="Remove Performer"
        description={`Are you sure you want to remove "${removingAssignment?.performer.name}" from this project?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemovePerformer}
        loading={removeLoading}
      />
    </>
  );
}
