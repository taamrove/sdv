"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  PIECE_STATUS_LABELS,
  PIECE_CONDITION_LABELS,
} from "@/lib/constants";
import { updatePiece } from "@/actions/pieces";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MapPin, Clock, User, Pencil, X, CalendarDays, FolderOpen, QrCode } from "lucide-react";
import { QRCodeDisplay } from "@/components/shared/qr-code-display";
import Image from "next/image";
import Link from "next/link";
import { getFullName } from "@/lib/format-name";

interface Piece {
  id: string;
  humanReadableId: string;
  status: string;
  condition: string;
  color: string | null;
  sizes: unknown;
  notes: string | null;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  imageUrl: string | null;
  createdAt: Date;
  item: { id: string; name: string; number: number };
  category: { id: string; code: string; name: string };
  warehouseLocation: { id: string; label: string } | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  createdAt: Date;
  details: unknown;
  performedBy: { firstName: string; lastName: string; email: string } | null;
}

interface Location {
  id: string;
  label: string;
}

interface Booking {
  bookingPieceId: string;
  productName: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  startDate: string | null;
  endDate: string | null;
}

interface PieceDetailProps {
  piece: Piece;
  history: HistoryEntry[];
  locations: Location[];
  bookings?: Booking[];
}

export function PieceDetail({ piece, history, locations, bookings = [] }: PieceDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Status & location fields (always shown in sidebar)
  const [status, setStatus] = useState(piece.status);
  const [condition, setCondition] = useState(piece.condition);
  const [locationId, setLocationId] = useState(
    piece.warehouseLocation?.id ?? "none"
  );

  // Editable detail fields
  const [color, setColor] = useState(piece.color ?? "");
  const [notes, setNotes] = useState(piece.notes ?? "");
  const [imageUrl, setImageUrl] = useState(piece.imageUrl);

  const existingSizes =
    piece.sizes && typeof piece.sizes === "object"
      ? (piece.sizes as Record<string, string>)
      : {};
  const [sizes, setSizes] = useState<Record<string, string>>(existingSizes);

  function updateSize(key: string, value: string) {
    setSizes((prev) => ({ ...prev, [key]: value }));
  }

  function cancelEdit() {
    setEditing(false);
    setColor(piece.color ?? "");
    setNotes(piece.notes ?? "");
    setImageUrl(piece.imageUrl);
    setSizes(existingSizes);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};

      if (status !== piece.status) data.status = status;
      if (condition !== piece.condition) data.condition = condition;
      if (locationId !== (piece.warehouseLocation?.id ?? "none")) {
        data.warehouseLocationId = locationId === "none" ? null : locationId;
      }

      if (editing) {
        const newColor = color.trim() || null;
        if (newColor !== piece.color) data.color = newColor;

        const newNotes = notes.trim() || null;
        if (newNotes !== piece.notes) data.notes = newNotes;

        if (imageUrl !== piece.imageUrl) data.imageUrl = imageUrl;

        // Check if sizes changed
        const filteredSizes: Record<string, string> = {};
        for (const [k, v] of Object.entries(sizes)) {
          if (v.trim()) filteredSizes[k] = v.trim();
        }
        const sizesChanged =
          JSON.stringify(filteredSizes) !== JSON.stringify(existingSizes);
        if (sizesChanged) {
          data.sizes = Object.keys(filteredSizes).length > 0 ? filteredSizes : undefined;
        }
      }

      if (Object.keys(data).length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      const result = await updatePiece(piece.id, data);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Piece updated");
        setEditing(false);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const displaySizes =
    piece.sizes && typeof piece.sizes === "object"
      ? (piece.sizes as Record<string, string>)
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Piece Details</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-base">
                  {piece.humanReadableId}
                </Badge>
                {!editing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image */}
            {editing ? (
              <div className="space-y-2">
                <Label>Image</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  folder="items"
                />
              </div>
            ) : (
              piece.imageUrl && (
                <Image
                  src={piece.imageUrl}
                  alt={piece.humanReadableId}
                  width={400}
                  height={300}
                  className="rounded-lg border object-cover"
                />
              )
            )}

            {/* Static info (item, category, dates) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Item</p>
                <p className="font-medium">{piece.item.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{piece.category.name}</p>
              </div>
              {piece.purchaseDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Date</p>
                  <p className="font-medium">
                    {new Date(piece.purchaseDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {piece.purchasePrice != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Price</p>
                  <p className="font-medium">
                    ${piece.purchasePrice.toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(piece.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Color */}
            {editing ? (
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g., Red"
                />
              </div>
            ) : (
              piece.color && (
                <div>
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{piece.color}</p>
                </div>
              )
            )}

            {/* Sizes */}
            {editing ? (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Sizes</h3>
                <div className="grid grid-cols-2 gap-4">
                  {["size", "chest", "waist", "hip", "shoe", "hat"].map(
                    (key) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs capitalize">{key}</Label>
                        <Input
                          value={sizes[key] ?? ""}
                          onChange={(e) => updateSize(key, e.target.value)}
                          placeholder={
                            key === "size"
                              ? "e.g., M, L, XL"
                              : key === "shoe"
                                ? "e.g., 42"
                                : `e.g., 90cm`
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              displaySizes &&
              Object.keys(displaySizes).some((k) => displaySizes[k]) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Sizes</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(displaySizes).map(
                      ([key, value]) =>
                        value && (
                          <Badge key={key} variant="secondary">
                            {key}: {value}
                          </Badge>
                        )
                    )}
                  </div>
                </div>
              )
            )}

            {/* Notes */}
            {editing ? (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            ) : (
              piece.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{piece.notes}</p>
                </div>
              )
            )}

            {/* Save/Cancel for edit mode */}
            {editing && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save All Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0"
                  >
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.action} />
                        <span className="text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.performedBy && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {getFullName(entry.performedBy)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Status / Location management */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PIECE_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Condition</p>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PIECE_CONDITION_LABELS).map(
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
              <p className="text-sm font-medium">Location</p>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {loc.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QRCodeDisplay
              itemId={piece.id}
              humanReadableId={piece.humanReadableId}
              size={160}
            />
          </CardContent>
        </Card>

        {/* Project Bookings */}
        {bookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Project Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.bookingPieceId}
                  className="rounded-md border p-3 space-y-1"
                >
                  <Link
                    href={`/projects/${booking.projectId}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {booking.projectName}
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={booking.projectStatus} />
                    <span className="text-xs text-muted-foreground">
                      {booking.productName}
                    </span>
                  </div>
                  {(booking.startDate || booking.endDate) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {booking.startDate
                        ? new Date(booking.startDate).toLocaleDateString()
                        : "?"}
                      {" - "}
                      {booking.endDate
                        ? new Date(booking.endDate).toLocaleDateString()
                        : "?"}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
