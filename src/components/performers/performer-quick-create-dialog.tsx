"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormRow } from "@/components/shared/form-row";
import { createPerformer } from "@/actions/performers";
import { PERFORMER_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

interface PerformerQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (p: { id: string; firstName: string; lastName: string }) => void;
}

export function PerformerQuickCreateDialog({
  open, onOpenChange, onSuccess,
}: PerformerQuickCreateDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", type: "DANCER" },
  });

  async function onSubmit(values: FormValues) {
    const result = await createPerformer({
      firstName: values.firstName,
      lastName: values.lastName,
      type: values.type as Parameters<typeof createPerformer>[0]["type"],
      active: true,
      requiresExactSize: false,
    });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const p = result.data as { id: string; contact: { firstName: string; lastName: string } };
    toast.success("Performer created");
    onSuccess({ id: p.id, firstName: p.contact.firstName, lastName: p.contact.lastName });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Performer</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <FormRow label="First Name" required error={form.formState.errors.firstName?.message} htmlFor="qc-firstName">
            <Input id="qc-firstName" placeholder="e.g., Maria" {...form.register("firstName")} />
          </FormRow>
          <FormRow label="Last Name" required error={form.formState.errors.lastName?.message} htmlFor="qc-lastName">
            <Input id="qc-lastName" placeholder="e.g., Garcia" {...form.register("lastName")} />
          </FormRow>
          <FormRow label="Type" required error={form.formState.errors.type?.message}>
            <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERFORMER_TYPE_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
