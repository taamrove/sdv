"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  createContainerSchema,
  type CreateContainerInput,
} from "@/lib/validators/container";
import { createContainer, updateContainer } from "@/actions/containers";
import { CONTAINER_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ContainerForEdit {
  id: string;
  name: string;
  type: string;
  description: string | null;
  notes: string | null;
  projectId: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface ContainerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: ContainerForEdit | null;
  projects: Project[];
}

export function ContainerFormDialog({
  open,
  onOpenChange,
  container,
  projects,
}: ContainerFormDialogProps) {
  const router = useRouter();
  const isEditing = !!container;

  const form = useForm<CreateContainerInput>({
    resolver: zodResolver(createContainerSchema),
    defaultValues: {
      name: "",
      type: "SUITCASE",
      description: "",
      projectId: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (open && container) {
      form.reset({
        name: container.name,
        type: container.type as CreateContainerInput["type"],
        description: container.description ?? "",
        projectId: container.projectId ?? null,
        notes: container.notes ?? "",
      });
    } else if (open && !container) {
      form.reset({
        name: "",
        type: "SUITCASE",
        description: "",
        projectId: null,
        notes: "",
      });
    }
  }, [open, container, form]);

  async function onSubmit(data: CreateContainerInput) {
    try {
      if (isEditing) {
        const result = await updateContainer(container.id, {
          name: data.name,
          type: data.type,
          description: data.description ?? null,
          projectId: data.projectId ?? null,
          notes: data.notes ?? null,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Container updated");
      } else {
        const result = await createContainer(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Container created");
      }
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Container" : "New Container"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Suitcase A-01"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(val) =>
                form.setValue("type", val as CreateContainerInput["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTAINER_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Project</Label>
            <Select
              value={form.watch("projectId") ?? "__none__"}
              onValueChange={(val) =>
                form.setValue("projectId", val === "__none__" ? null : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              {...form.register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
