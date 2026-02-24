"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ITEM_STATUS_LABELS,
  ITEM_CONDITION_LABELS,
} from "@/lib/constants";
import {
  Package,
  MapPin,
  Palette,
  Ruler,
  Tag,
  ExternalLink,
  Wrench,
  Shirt,
} from "lucide-react";
import { getFullName } from "@/lib/format-name";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
  number: number;
  size: string | null;
}

interface Category {
  id: string;
  code: string;
  name: string;
}

interface WarehouseLocation {
  id: string;
  label: string;
}

interface ContainerItem {
  id: string;
  packedAt: string;
  container: {
    id: string;
    name: string;
    status: string;
    project: { id: string; name: string } | null;
  };
  packedBy: { id: string; firstName: string; lastName: string } | null;
}

interface BookingItem {
  id: string;
  booking: {
    id: string;
    kit: { name: string };
    project: { id: string; name: string; status: string };
  };
}

interface MaintenanceTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  severity: string | null;
}

export interface ScannedItem {
  id: string;
  humanReadableId: string;
  status: string;
  condition: string;
  color: string | null;
  notes: string | null;
  isExternal: boolean;
  product: Product;
  category: Category;
  warehouseLocation: WarehouseLocation | null;
  containerItems: ContainerItem[];
  bookingItems: BookingItem[];
  maintenanceTickets: MaintenanceTicket[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScanResultCardProps {
  item: ScannedItem;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScanResultCard({ item }: ScanResultCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-mono text-lg font-bold">
              {item.humanReadableId}
            </CardTitle>
            <CardDescription className="text-base">
              {item.product.name}
            </CardDescription>
          </div>
          {item.isExternal && (
            <Badge variant="outline" className="gap-1">
              <ExternalLink className="size-3" />
              External
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Item details grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{item.category.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge
                status={item.status}
                label={ITEM_STATUS_LABELS[item.status] ?? item.status}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <p className="text-muted-foreground">Condition</p>
              <StatusBadge
                status={item.condition}
                label={ITEM_CONDITION_LABELS[item.condition] ?? item.condition}
              />
            </div>
          </div>

          {item.color && (
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Color</p>
                <p className="font-medium">{item.color}</p>
              </div>
            </div>
          )}

          {item.product.size && (
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Size</p>
                <p className="font-medium">{item.product.size}</p>
              </div>
            </div>
          )}

          {item.warehouseLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{item.warehouseLocation.label}</p>
              </div>
            </div>
          )}
        </div>

        {/* Packed in section */}
        {item.containerItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4" />
              Packed in
            </h4>
            <div className="space-y-2">
              {item.containerItems.map((ci) => (
                <div
                  key={ci.id}
                  className="rounded-md border bg-muted/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/containers/${ci.container.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {ci.container.name}
                    </Link>
                    {ci.container.project && (
                      <span className="text-muted-foreground">
                        {ci.container.project.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-muted-foreground">
                    {ci.packedBy && <span>by {getFullName(ci.packedBy)}</span>}
                    <span>{formatDate(ci.packedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned to bookings section */}
        {item.bookingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Shirt className="size-4" />
              Assigned to
            </h4>
            <div className="space-y-2">
              {item.bookingItems.map((bi) => (
                <div
                  key={bi.id}
                  className="rounded-md border bg-muted/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {bi.booking.kit.name}
                    </span>
                    <Link
                      href={`/projects/${bi.booking.project.id}`}
                      className="text-primary hover:underline"
                    >
                      {bi.booking.project.name}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance tickets section */}
        {item.maintenanceTickets.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="size-4" />
              Maintenance
            </h4>
            <div className="space-y-2">
              {item.maintenanceTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/maintenance/${ticket.id}`}
                  className="block rounded-md border bg-muted/50 p-3 text-sm hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ticket.title}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.priority} label={ticket.priority} />
                      <StatusBadge status={ticket.status} label={ticket.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="text-sm">
            <p className="font-semibold">Notes</p>
            <p className="text-muted-foreground">{item.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
