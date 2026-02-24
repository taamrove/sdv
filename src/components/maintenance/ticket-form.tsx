"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createTicketSchema,
  type CreateTicketInput,
} from "@/lib/validators/maintenance";
import { createTicket, addPhoto } from "@/actions/maintenance";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_SEVERITY_LABELS,
} from "@/lib/constants";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ItemOption {
  id: string;
  humanReadableId: string;
  product: { name: string };
  category: { name: string };
}

interface TicketFormProps {
  items: ItemOption[];
}

export function TicketForm({ items }: TicketFormProps) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState("");

  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      itemId: "",
      priority: "MEDIUM",
    },
  });

  const filteredItems = itemFilter
    ? items.filter(
        (p) =>
          p.humanReadableId
            .toLowerCase()
            .includes(itemFilter.toLowerCase()) ||
          p.product.name.toLowerCase().includes(itemFilter.toLowerCase())
      )
    : items;

  async function onSubmit(data: CreateTicketInput) {
    try {
      const result = await createTicket(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const ticket = result.data as { id: string };

      // If a photo was uploaded, attach it to the ticket
      if (photoUrl) {
        const photoResult = await addPhoto(ticket.id, photoUrl);
        if ("error" in photoResult) {
          toast.error(`Ticket created but photo failed: ${photoResult.error}`);
        }
      }

      toast.success("Maintenance ticket created");
      router.push(`/maintenance/${ticket.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create Maintenance Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Item Selector */}
          <div className="space-y-2">
            <Label htmlFor="itemId">Item *</Label>
            <div className="space-y-2">
              <Input
                placeholder="Filter items..."
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
              />
              <Select
                value={form.watch("itemId") || ""}
                onValueChange={(val) => form.setValue("itemId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {filteredItems.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.humanReadableId} - {p.product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.formState.errors.itemId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.itemId.message}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Torn seam on left sleeve"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description of the issue..."
              {...form.register("description")}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={form.watch("priority") ?? "MEDIUM"}
              onValueChange={(val) =>
                form.setValue(
                  "priority",
                  val as CreateTicketInput["priority"]
                )
              }
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

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select
              value={form.watch("severity") ?? ""}
              onValueChange={(val) =>
                form.setValue(
                  "severity",
                  val as CreateTicketInput["severity"]
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity (optional)" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MAINTENANCE_SEVERITY_LABELS).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Minor issues don&apos;t remove item from availability
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <ImageUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              folder="maintenance"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
