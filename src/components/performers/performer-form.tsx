"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPerformerSchema,
  type CreatePerformerInput,
} from "@/lib/validators/performer";
import { createPerformer, updatePerformer } from "@/actions/performers";
import { PERFORMER_TYPE_LABELS, SIZE_FLEX_DIRECTION_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SizeProfile {
  size?: string;
  chest?: string;
  waist?: string;
  hip?: string;
  height?: string;
  shoe?: string;
  hat?: string;
  [key: string]: string | undefined;
}

interface PerformerFormProps {
  performer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
    sizes: unknown;
    notes: string | null;
    active: boolean;
    requiresExactSize: boolean;
    sizeFlexDirection: string | null;
  };
}

export function PerformerForm({ performer }: PerformerFormProps) {
  const router = useRouter();
  const isEditing = !!performer;

  const existingSizes = (performer?.sizes as SizeProfile) ?? {};

  const form = useForm<CreatePerformerInput>({
    resolver: zodResolver(createPerformerSchema),
    defaultValues: {
      name: performer?.name ?? "",
      email: performer?.email ?? undefined,
      phone: performer?.phone ?? undefined,
      type: (performer?.type as CreatePerformerInput["type"]) ?? "DANCER",
      sizes: existingSizes,
      notes: performer?.notes ?? undefined,
      active: performer?.active ?? true,
      requiresExactSize: performer?.requiresExactSize ?? false,
      sizeFlexDirection: (performer?.sizeFlexDirection as CreatePerformerInput["sizeFlexDirection"]) ?? undefined,
    },
  });

  async function onSubmit(data: CreatePerformerInput) {
    try {
      if (isEditing) {
        const result = await updatePerformer(performer.id, data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Performer updated");
      } else {
        const result = await createPerformer(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Performer created");
      }
      router.push("/performers");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Edit Performer" : "Create Performer"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Maria Garcia"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 890"
                  {...form.register("phone")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Performer Type *</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(val) =>
                  form.setValue("type", val as CreatePerformerInput["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERFORMER_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-sm">Size Profile (optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="size" className="text-xs">
                    General Size
                  </Label>
                  <Input
                    id="size"
                    placeholder="e.g., M, L, XL"
                    defaultValue={existingSizes.size ?? ""}
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        size: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="chest" className="text-xs">
                    Chest
                  </Label>
                  <Input
                    id="chest"
                    placeholder="e.g., 90cm"
                    defaultValue={existingSizes.chest ?? ""}
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        chest: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="waist" className="text-xs">
                    Waist
                  </Label>
                  <Input
                    id="waist"
                    placeholder="e.g., 75cm"
                    defaultValue={existingSizes.waist ?? ""}
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        waist: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hip" className="text-xs">
                    Hip
                  </Label>
                  <Input
                    id="hip"
                    placeholder="e.g., 95cm"
                    defaultValue={existingSizes.hip ?? ""}
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        hip: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shoe" className="text-xs">
                    Shoe Size
                  </Label>
                  <Input
                    id="shoe"
                    placeholder="e.g., 42"
                    defaultValue={existingSizes.shoe ?? ""}
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        shoe: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hat" className="text-xs">
                    Hat Size
                  </Label>
                  <Input
                    id="hat"
                    placeholder="e.g., 58"
                    defaultValue={existingSizes.hat ?? ""}
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        hat: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="requiresExactSize"
                  checked={form.watch("requiresExactSize") ?? false}
                  onCheckedChange={(checked) => {
                    form.setValue("requiresExactSize", checked);
                    if (checked) {
                      form.setValue("sizeFlexDirection", null);
                    }
                  }}
                />
                <Label htmlFor="requiresExactSize">Requires Exact Size</Label>
              </div>

              {!form.watch("requiresExactSize") && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="sizeFlexDirection" className="text-xs">
                    Size Flexibility Direction
                  </Label>
                  <Select
                    value={form.watch("sizeFlexDirection") ?? "none"}
                    onValueChange={(val) =>
                      form.setValue(
                        "sizeFlexDirection",
                        val === "none"
                          ? null
                          : (val as CreatePerformerInput["sizeFlexDirection"])
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      {Object.entries(SIZE_FLEX_DIRECTION_LABELS).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                {...form.register("notes")}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={form.watch("active") ?? true}
                onCheckedChange={(checked) => form.setValue("active", checked)}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update"
                    : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
