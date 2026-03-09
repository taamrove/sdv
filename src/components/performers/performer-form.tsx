"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPerformerSchema, type CreatePerformerInput,
} from "@/lib/validators/performer";
import { createPerformer, updatePerformer } from "@/actions/performers";
import { PERFORMER_TYPE_LABELS, SIZE_FLEX_DIRECTION_LABELS } from "@/lib/constants";
import { FormRow, FormSection } from "@/components/shared/form-row";
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
    type: string;
    sizes: unknown;
    notes: string | null;
    active: boolean;
    requiresExactSize: boolean;
    sizeFlexDirection: string | null;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  };
}

const SIZE_FIELDS = [
  { key: "size",   label: "General",  placeholder: "M, L, XL" },
  { key: "chest",  label: "Chest",    placeholder: "90 cm" },
  { key: "waist",  label: "Waist",    placeholder: "75 cm" },
  { key: "hip",    label: "Hip",      placeholder: "95 cm" },
  { key: "shoe",   label: "Shoe",     placeholder: "42 EU" },
  { key: "hat",    label: "Hat",      placeholder: "58 cm" },
];

export function PerformerForm({ performer }: PerformerFormProps) {
  const router = useRouter();
  const isEditing = !!performer;
  const existingSizes = (performer?.sizes as SizeProfile) ?? {};

  const form = useForm<CreatePerformerInput>({
    resolver: zodResolver(createPerformerSchema),
    defaultValues: {
      firstName: performer?.contact.firstName ?? "",
      lastName:  performer?.contact.lastName  ?? "",
      email:     performer?.contact.email     ?? undefined,
      phone:     performer?.contact.phone     ?? undefined,
      type:      (performer?.type as CreatePerformerInput["type"]) ?? "DANCER",
      sizes:     existingSizes,
      notes:     performer?.notes ?? undefined,
      active:    performer?.active ?? true,
      requiresExactSize:   performer?.requiresExactSize ?? false,
      sizeFlexDirection:   (performer?.sizeFlexDirection as CreatePerformerInput["sizeFlexDirection"]) ?? undefined,
    },
  });

  const errors = form.formState.errors;

  async function onSubmit(data: CreatePerformerInput) {
    try {
      if (isEditing) {
        const result = await updatePerformer(performer.id, data);
        if ("error" in result) { toast.error(result.error); return; }
        toast.success("Performer updated");
      } else {
        const result = await createPerformer(data);
        if ("error" in result) { toast.error(result.error); return; }
        toast.success("Performer created");
      }
      router.push("/performers");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Performer" : "New Performer"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ── Contact ── */}
            <FormRow label="First Name" required htmlFor="firstName" error={errors.firstName?.message}>
              <Input id="firstName" placeholder="e.g., Maria" {...form.register("firstName")} />
            </FormRow>
            <FormRow label="Last Name" required htmlFor="lastName" error={errors.lastName?.message}>
              <Input id="lastName" placeholder="e.g., Garcia" {...form.register("lastName")} />
            </FormRow>
            <FormRow label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="email@example.com" {...form.register("email")} />
            </FormRow>
            <FormRow label="Phone" htmlFor="phone">
              <Input id="phone" placeholder="+1 234 567 890" {...form.register("phone")} />
            </FormRow>

            <FormSection title="Performer" />

            <FormRow label="Type" required error={errors.type?.message}>
              <Select
                value={form.watch("type")}
                onValueChange={(val) => form.setValue("type", val as CreatePerformerInput["type"])}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERFORMER_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormSection title="Sizes (optional)" />

            <FormRow label="Measurements">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SIZE_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <Input
                      placeholder={placeholder}
                      defaultValue={existingSizes[key] ?? ""}
                      onChange={(e) => {
                        const s = form.getValues("sizes") ?? {};
                        form.setValue("sizes", { ...s, [key]: e.target.value });
                      }}
                    />
                  </div>
                ))}
              </div>
            </FormRow>

            <FormRow label="Exact Size" align="center">
              <Switch
                id="requiresExactSize"
                checked={form.watch("requiresExactSize") ?? false}
                onCheckedChange={(checked) => {
                  form.setValue("requiresExactSize", checked);
                  if (checked) form.setValue("sizeFlexDirection", null);
                }}
              />
            </FormRow>

            {!form.watch("requiresExactSize") && (
              <FormRow label="Flex Direction">
                <Select
                  value={form.watch("sizeFlexDirection") ?? "none"}
                  onValueChange={(val) =>
                    form.setValue("sizeFlexDirection", val === "none" ? null : (val as CreatePerformerInput["sizeFlexDirection"]))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="No preference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    {Object.entries(SIZE_FLEX_DIRECTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            )}

            <FormSection title="Other" />

            <FormRow label="Notes" htmlFor="notes">
              <Textarea id="notes" placeholder="Optional notes..." {...form.register("notes")} />
            </FormRow>

            <FormRow label="Active" align="center">
              <Switch
                id="active"
                checked={form.watch("active") ?? true}
                onCheckedChange={(checked) => form.setValue("active", checked)}
              />
            </FormRow>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
