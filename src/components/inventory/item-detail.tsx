"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { InfoRow, FormRow } from "@/components/shared/form-row";
import { PerformerCombobox } from "@/components/shared/performer-combobox";
import { PerformerQuickCreateDialog } from "@/components/performers/performer-quick-create-dialog";
import {
  ITEM_STATUS_LABELS,
  ITEM_CONDITION_LABELS,
  CLOTHING_SIZES,
  SHOE_SIZES_EU,
  HAT_SIZES_CM,
} from "@/lib/constants";
import { updateItem } from "@/actions/items";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Clock,
  Pencil,
  X,
  CalendarDays,
  FolderOpen,
  QrCode,
  Archive,
  MapPin,
} from "lucide-react";
import { QRCodeDisplay } from "@/components/shared/qr-code-display";
import Image from "next/image";
import Link from "next/link";
import { getFullName } from "@/lib/format-name";
import { LocationCascadingSelect, type FullLocation } from "@/components/warehouse/location-cascading-select";
import { CompactActivityLog, type ActivityEntry } from "@/components/dashboard/activity-log";

interface Performer {
  id: string;
  firstName: string;
  lastName: string;
}

interface Item {
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
  archived: boolean;
  createdAt: Date;
  product: { id: string; name: string; number: number };
  category: { id: string; code: string; name: string };
  subCategory: { name: string } | null;
  warehouseLocation: FullLocation | null;
  mainPerformer: Performer | null;
}

type Location = FullLocation;

interface Booking {
  bookingItemId: string;
  kitName: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  startDate: string | null;
  endDate: string | null;
}

interface ItemDetailProps {
  item: Item;
  history: ActivityEntry[];
  locations: Location[];
  bookings?: Booking[];
  sizeMode?: string | null;
  performers?: Performer[];
}

export function ItemDetail({
  item,
  history,
  locations,
  bookings = [],
  sizeMode,
  performers = [],
}: ItemDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [performerDialogOpen, setPerformerDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [localLocations, setLocalLocations] = useState(locations);
  const [localPerformers, setLocalPerformers] = useState(performers);

  // All editable fields — unified under the single Edit toggle
  const [status, setStatus] = useState(item.status);
  const [condition, setCondition] = useState(item.condition);
  const [locationId, setLocationId] = useState<string | undefined>(
    item.warehouseLocation?.id ?? undefined
  );
  const [mainPerformerId, setMainPerformerId] = useState(
    item.mainPerformer?.id ?? "none"
  );
  const [color, setColor] = useState(item.color ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl);

  const existingSizes =
    item.sizes && typeof item.sizes === "object"
      ? (item.sizes as Record<string, string>)
      : {};
  const [sizes, setSizes] = useState<Record<string, string>>(existingSizes);

  function updateSize(key: string, value: string) {
    setSizes((prev) => ({ ...prev, [key]: value }));
  }

  function cancelEdit() {
    setEditing(false);
    // Reset ALL editable fields
    setStatus(item.status);
    setCondition(item.condition);
    setLocationId(item.warehouseLocation?.id ?? undefined);
    setMainPerformerId(item.mainPerformer?.id ?? "none");
    setColor(item.color ?? "");
    setNotes(item.notes ?? "");
    setImageUrl(item.imageUrl);
    setSizes(existingSizes);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};

      // All fields checked unconditionally — no editing guard
      if (status !== item.status) data.status = status;
      if (condition !== item.condition) data.condition = condition;
      if (locationId !== (item.warehouseLocation?.id ?? undefined)) {
        data.warehouseLocationId = locationId ?? null;
      }
      const newMainPerformerId = mainPerformerId === "none" ? null : mainPerformerId;
      if (newMainPerformerId !== (item.mainPerformer?.id ?? null)) {
        data.mainPerformerId = newMainPerformerId;
      }

      const newColor = color.trim() || null;
      if (newColor !== item.color) data.color = newColor;

      const newNotes = notes.trim() || null;
      if (newNotes !== item.notes) data.notes = newNotes;

      if (imageUrl !== item.imageUrl) data.imageUrl = imageUrl;

      const filteredSizes: Record<string, string> = {};
      for (const [k, v] of Object.entries(sizes)) {
        if (v.trim()) filteredSizes[k] = v.trim();
      }
      const sizesChanged =
        JSON.stringify(filteredSizes) !== JSON.stringify(existingSizes);
      if (sizesChanged) {
        data.sizes = Object.keys(filteredSizes).length > 0 ? filteredSizes : undefined;
      }

      if (Object.keys(data).length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      const result = await updateItem(item.id, data);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Item updated");
        setEditing(false);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    const confirmed = window.confirm(
      item.archived
        ? "Restore this item? It will appear in the normal item list again."
        : "Archive this item? It will be hidden from normal views but can be restored later."
    );
    if (!confirmed) return;
    setArchiving(true);
    try {
      const result = await updateItem(item.id, { archived: !item.archived });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(item.archived ? "Item restored" : "Item archived");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setArchiving(false);
    }
  }

  const displaySizes =
    item.sizes && typeof item.sizes === "object"
      ? (item.sizes as Record<string, string>)
      : null;

  function renderEditSizeFields() {
    if (sizeMode === "clothing") {
      return (
        <FormRow label="Sizes">
          <Select value={sizes["size"] ?? ""} onValueChange={(val) => updateSize("size", val)}>
            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
            <SelectContent>
              {CLOTHING_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormRow>
      );
    }
    if (sizeMode === "shoes") {
      return (
        <FormRow label="Sizes">
          <Select value={sizes["shoe"] ?? ""} onValueChange={(val) => updateSize("shoe", val)}>
            <SelectTrigger><SelectValue placeholder="Select EU size" /></SelectTrigger>
            <SelectContent>
              {SHOE_SIZES_EU.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormRow>
      );
    }
    if (sizeMode === "hat") {
      return (
        <FormRow label="Sizes">
          <Select value={sizes["hat"] ?? ""} onValueChange={(val) => updateSize("hat", val)}>
            <SelectTrigger><SelectValue placeholder="Select hat size" /></SelectTrigger>
            <SelectContent>
              {HAT_SIZES_CM.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormRow>
      );
    }
    if (sizeMode === "measurements") {
      return (
        <>
          {[
            { key: "chest", label: "Chest", placeholder: "cm" },
            { key: "waist", label: "Waist", placeholder: "cm" },
            { key: "hip", label: "Hip", placeholder: "cm" },
            { key: "length", label: "Length", placeholder: "cm" },
          ].map(({ key, label, placeholder }) => (
            <FormRow key={key} label={label} htmlFor={`size-${key}`}>
              <Input
                id={`size-${key}`}
                value={sizes[key] ?? ""}
                onChange={(e) => updateSize(key, e.target.value)}
                placeholder={placeholder}
              />
            </FormRow>
          ))}
        </>
      );
    }
    // Generic
    return (
      <FormRow label="Sizes">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">General</Label>
            <Select value={sizes["size"] ?? ""} onValueChange={(val) => updateSize("size", val)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Size" /></SelectTrigger>
              <SelectContent>
                {CLOTHING_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Shoe (EU)</Label>
            <Select value={sizes["shoe"] ?? ""} onValueChange={(val) => updateSize("shoe", val)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="EU size" /></SelectTrigger>
              <SelectContent>
                {SHOE_SIZES_EU.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hat (cm)</Label>
            <Select value={sizes["hat"] ?? ""} onValueChange={(val) => updateSize("hat", val)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Hat size" /></SelectTrigger>
              <SelectContent>
                {HAT_SIZES_CM.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {[
            { key: "chest", label: "Chest", placeholder: "e.g., 90cm" },
            { key: "waist", label: "Waist", placeholder: "e.g., 75cm" },
            { key: "hip", label: "Hip", placeholder: "e.g., 95cm" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                className="h-8 text-sm"
                value={sizes[key] ?? ""}
                onChange={(e) => updateSize(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </FormRow>
    );
  }

  return (
    <>
    <div className="grid gap-4 md:grid-cols-3">
      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="md:col-span-2 space-y-3 order-2 md:order-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Item Details</span>
              <div className="flex items-center gap-1">
                {item.archived && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Archive className="mr-1 h-3 w-3" />
                    Archived
                  </Badge>
                )}
                {/* QR Code — icon in header, opens dialog (primary on mobile) */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 md:hidden"
                  onClick={() => setQrDialogOpen(true)}
                  title="QR Code"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                {/* Inline Archive / Restore button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={handleArchive}
                  disabled={archiving}
                  title={item.archived ? "Restore" : "Archive"}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                {/* Edit / Cancel */}
                {!editing ? (
                  <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
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
          <CardContent className="space-y-3">
            {/* Image */}
            {editing ? (
              <FormRow label="Image">
                <ImageUpload value={imageUrl} onChange={(url) => setImageUrl(url)} folder="items" />
              </FormRow>
            ) : (
              item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.humanReadableId}
                  width={400}
                  height={240}
                  className="rounded-lg border object-cover max-h-56 w-auto"
                />
              )
            )}

            {/* ── Status ─────────────────────────────────────── */}
            {editing ? (
              <FormRow label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITEM_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            ) : (
              <InfoRow label="Status">
                <StatusBadge status={item.status} label={ITEM_STATUS_LABELS[item.status]} />
              </InfoRow>
            )}

            {/* ── Condition ──────────────────────────────────── */}
            {editing ? (
              <FormRow label="Condition">
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITEM_CONDITION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            ) : (
              <InfoRow label="Condition">
                <StatusBadge status={item.condition} label={ITEM_CONDITION_LABELS[item.condition]} />
              </InfoRow>
            )}

            {/* ── Location ───────────────────────────────────── */}
            {editing ? (
              <FormRow label="Location">
                <LocationCascadingSelect
                  locations={localLocations}
                  value={locationId}
                  onValueChange={setLocationId}
                />
              </FormRow>
            ) : (
              item.warehouseLocation ? (
                <InfoRow label="Location">
                  <div className="space-y-0.5">
                    {item.warehouseLocation.warehouse && (
                      <p className="text-xs text-muted-foreground">
                        {item.warehouseLocation.warehouse.name}
                      </p>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-sm">{item.warehouseLocation.label}</span>
                    </div>
                  </div>
                </InfoRow>
              ) : null
            )}

            {/* ── Performer ──────────────────────────────────── */}
            {editing ? (
              <FormRow label="Performer">
                <PerformerCombobox
                  performers={localPerformers}
                  value={mainPerformerId === "none" ? undefined : mainPerformerId}
                  onValueChange={(id) => setMainPerformerId(id ?? "none")}
                  onNewPerformer={() => setPerformerDialogOpen(true)}
                />
              </FormRow>
            ) : (
              item.mainPerformer && (
                <InfoRow label="Performer">{getFullName(item.mainPerformer)}</InfoRow>
              )
            )}

            {/* ── Color ──────────────────────────────────────── */}
            {editing ? (
              <FormRow label="Color" htmlFor="color">
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g., Red"
                />
              </FormRow>
            ) : (
              item.color && <InfoRow label="Color">{item.color}</InfoRow>
            )}

            {/* ── Sizes ──────────────────────────────────────── */}
            {editing ? (
              renderEditSizeFields()
            ) : (
              displaySizes && Object.keys(displaySizes).some((k) => displaySizes[k]) && (
                <InfoRow label="Sizes">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(displaySizes).map(([key, value]) =>
                      value && (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {value}
                        </Badge>
                      )
                    )}
                  </div>
                </InfoRow>
              )
            )}

            {/* ── Notes ──────────────────────────────────────── */}
            {editing ? (
              <FormRow label="Notes" htmlFor="notes">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </FormRow>
            ) : (
              item.notes && <InfoRow label="Notes">{item.notes}</InfoRow>
            )}

            {/* ── Static metadata ────────────────────────────── */}
            {!editing && (
              <div className="space-y-1">
                {item.purchaseDate && (
                  <InfoRow label="Purchased">
                    {new Date(item.purchaseDate).toLocaleDateString()}
                  </InfoRow>
                )}
                {item.purchasePrice != null && (
                  <InfoRow label="Price">${item.purchasePrice.toFixed(2)}</InfoRow>
                )}
                <InfoRow label="Created">
                  {new Date(item.createdAt).toLocaleDateString()}
                </InfoRow>
              </div>
            )}

            {/* Save / Cancel */}
            {editing && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save All Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CompactActivityLog entries={history} />
          </CardContent>
        </Card>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="space-y-3 order-1 md:order-2">

        {/* QR Code — full card on desktop; icon in card header handles mobile */}
        <Card className="hidden md:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QRCodeDisplay
              itemId={item.id}
              humanReadableId={item.humanReadableId}
              productName={item.product.name}
              sizes={displaySizes ?? undefined}
              size={160}
            />
          </CardContent>
        </Card>

        {/* Project Bookings */}
        {bookings.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Project Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bookings.map((booking) => (
                <div key={booking.bookingItemId} className="rounded-md border p-2 space-y-1">
                  <Link
                    href={`/projects/${booking.projectId}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {booking.projectName}
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={booking.projectStatus} />
                    <span className="text-xs text-muted-foreground">{booking.kitName}</span>
                  </div>
                  {(booking.startDate || booking.endDate) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : "?"}
                      {" - "}
                      {booking.endDate ? new Date(booking.endDate).toLocaleDateString() : "?"}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>

    <PerformerQuickCreateDialog
      open={performerDialogOpen}
      onOpenChange={setPerformerDialogOpen}
      onSuccess={(p) => {
        setLocalPerformers((prev) => [...prev, p]);
        setMainPerformerId(p.id);
      }}
    />

    {/* QR Code dialog — shown on mobile when the icon button is tapped */}
    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </DialogTitle>
        </DialogHeader>
        <QRCodeDisplay
          itemId={item.id}
          humanReadableId={item.humanReadableId}
          productName={item.product.name}
          sizes={displaySizes ?? undefined}
          size={200}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
