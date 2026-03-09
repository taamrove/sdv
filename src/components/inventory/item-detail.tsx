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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { ImageUpload } from "@/components/shared/image-upload";
import { InfoRow, FormRow } from "@/components/shared/form-row";
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
import { MapPin, Clock, Pencil, X, CalendarDays, FolderOpen, QrCode, Archive, Plus } from "lucide-react";
import { QRCodeDisplay } from "@/components/shared/qr-code-display";
import Image from "next/image";
import Link from "next/link";
import { getFullName } from "@/lib/format-name";
import { LocationFormDialog } from "@/components/warehouse/location-form-dialog";
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
  warehouseLocation: { id: string; label: string } | null;
  mainPerformer: Performer | null;
}

interface Location {
  id: string;
  label: string;
}

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
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [localLocations, setLocalLocations] = useState(locations);

  // Status & location fields (always shown in sidebar)
  const [status, setStatus] = useState(item.status);
  const [condition, setCondition] = useState(item.condition);
  const [locationId, setLocationId] = useState(
    item.warehouseLocation?.id ?? "none"
  );
  const [mainPerformerId, setMainPerformerId] = useState(
    item.mainPerformer?.id ?? "none"
  );

  // Editable detail fields
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
    setColor(item.color ?? "");
    setNotes(item.notes ?? "");
    setImageUrl(item.imageUrl);
    setSizes(existingSizes);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};

      if (status !== item.status) data.status = status;
      if (condition !== item.condition) data.condition = condition;
      if (locationId !== (item.warehouseLocation?.id ?? "none")) {
        data.warehouseLocationId = locationId === "none" ? null : locationId;
      }
      const newMainPerformerId = mainPerformerId === "none" ? null : mainPerformerId;
      if (newMainPerformerId !== (item.mainPerformer?.id ?? null)) {
        data.mainPerformerId = newMainPerformerId;
      }

      if (editing) {
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
        <div className="space-y-1">
          <Label className="text-xs">Clothing Size</Label>
          <Select value={sizes["size"] ?? ""} onValueChange={(val) => updateSize("size", val)}>
            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
            <SelectContent>
              {CLOTHING_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (sizeMode === "shoes") {
      return (
        <div className="space-y-1">
          <Label className="text-xs">Shoe Size (EU)</Label>
          <Select value={sizes["shoe"] ?? ""} onValueChange={(val) => updateSize("shoe", val)}>
            <SelectTrigger><SelectValue placeholder="Select EU size" /></SelectTrigger>
            <SelectContent>
              {SHOE_SIZES_EU.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (sizeMode === "hat") {
      return (
        <div className="space-y-1">
          <Label className="text-xs">Hat Size (cm)</Label>
          <Select value={sizes["hat"] ?? ""} onValueChange={(val) => updateSize("hat", val)}>
            <SelectTrigger><SelectValue placeholder="Select hat size" /></SelectTrigger>
            <SelectContent>
              {HAT_SIZES_CM.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (sizeMode === "measurements") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: "chest", label: "Chest", placeholder: "e.g., 90cm" },
            { key: "waist", label: "Waist", placeholder: "e.g., 75cm" },
            { key: "hip", label: "Hip", placeholder: "e.g., 95cm" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                value={sizes[key] ?? ""}
                onChange={(e) => updateSize(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      );
    }
    // Generic
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { key: "size", label: "Size", placeholder: "e.g., M, L, XL" },
          { key: "chest", label: "Chest", placeholder: "e.g., 90cm" },
          { key: "waist", label: "Waist", placeholder: "e.g., 75cm" },
          { key: "hip", label: "Hip", placeholder: "e.g., 95cm" },
          { key: "shoe", label: "Shoe Size", placeholder: "e.g., 42" },
          { key: "hat", label: "Hat Size", placeholder: "e.g., 58" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Input
              value={sizes[key] ?? ""}
              onChange={(e) => updateSize(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <div className="grid gap-4 md:grid-cols-3">
      {/* Main column */}
      <div className="md:col-span-2 space-y-3 order-2 md:order-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Item Details</span>
              <div className="flex items-center gap-2">
                {item.archived && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Archive className="mr-1 h-3 w-3" />
                    Archived
                  </Badge>
                )}
                <Badge variant="outline" className="font-mono text-base">
                  {item.humanReadableId}
                </Badge>
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

            {/* Static info */}
            <div className="space-y-1">
              <InfoRow label="Product">{item.product.name}</InfoRow>
              <InfoRow label="Category">{item.category.name}</InfoRow>
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

            {/* Color */}
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

            {/* Sizes */}
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

            {/* Main performer (read mode) */}
            {!editing && item.mainPerformer && (
              <InfoRow label="Performer">{getFullName(item.mainPerformer)}</InfoRow>
            )}

            {/* Notes */}
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

      {/* Sidebar */}
      <div className="space-y-3 order-1 md:order-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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

            <FormRow label="Location">
              <Select
                value={locationId}
                onValueChange={(val) => {
                  if (val === "__new_location__") {
                    setLocationDialogOpen(true);
                    return;
                  }
                  setLocationId(val);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {localLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {loc.label}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="__new_location__">
                    <Plus className="mr-1 h-3 w-3 inline-block" /> New location
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow
              label="Performer"
              hint={performers.length === 0 ? "Add performers in the Performers section first." : undefined}
            >
              <Select
                value={mainPerformerId}
                onValueChange={setMainPerformerId}
                disabled={performers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={performers.length === 0 ? "None yet" : "Not assigned"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {performers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{getFullName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
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

        {/* Archive */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Archive className="h-4 w-4" />
              {item.archived ? "Restore Item" : "Archive Item"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              {item.archived
                ? "This item is archived. Restore it to make it appear in normal views."
                : "Archive this item when it is out of service. It will be hidden from normal views but can be restored."}
            </p>
            <Button
              variant={item.archived ? "outline" : "destructive"}
              size="sm"
              className="w-full"
              onClick={handleArchive}
              disabled={archiving}
            >
              <Archive className="mr-2 h-4 w-4" />
              {archiving ? "..." : item.archived ? "Restore Item" : "Archive Item"}
            </Button>
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

    <LocationFormDialog
      open={locationDialogOpen}
      onOpenChange={setLocationDialogOpen}
      onSuccess={(loc) => {
        setLocalLocations((prev) => [...prev, loc]);
        setLocationId(loc.id);
      }}
    />
    </>
  );
}
