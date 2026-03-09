"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormRow } from "@/components/shared/form-row";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validators/project";
import { createProject, updateProject } from "@/actions/projects";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Theme {
  id: string;
  name: string;
}

interface ProjectFormProps {
  themes: Theme[];
  project?: {
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
  };
}

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export function ProjectForm({ themes, project }: ProjectFormProps) {
  const router = useRouter();
  const isEditing = !!project;

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      venue: project?.venue ?? "",
      city: project?.city ?? "",
      country: project?.country ?? "",
      startDate: toDateInputValue(project?.startDate ?? null),
      endDate: toDateInputValue(project?.endDate ?? null),
      status: (project?.status as CreateProjectInput["status"]) ?? "PLANNING",
      notes: project?.notes ?? "",
    },
  });

  async function onSubmit(data: CreateProjectInput) {
    try {
      if (isEditing) {
        const result = await updateProject(project.id, data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Project updated");
        router.push(`/projects/${project.id}`);
      } else {
        const result = await createProject(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Project created");
        router.push("/projects");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Project" : "Create Project"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormRow
            label="Project Name"
            required
            htmlFor="name"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="name"
              placeholder="e.g., Summer Tour 2026"
              {...form.register("name")}
            />
          </FormRow>

          <FormRow label="Description" htmlFor="description">
            <Textarea
              id="description"
              placeholder="Optional description..."
              {...form.register("description")}
            />
          </FormRow>

          <FormRow label="Venue" htmlFor="venue">
            <Input
              id="venue"
              placeholder="e.g., Grand Theatre"
              {...form.register("venue")}
            />
          </FormRow>

          <FormRow label="City" htmlFor="city">
            <Input
              id="city"
              placeholder="e.g., Vienna"
              {...form.register("city")}
            />
          </FormRow>

          <FormRow label="Country" htmlFor="country">
            <Input
              id="country"
              placeholder="e.g., Austria"
              {...form.register("country")}
            />
          </FormRow>

          <FormRow label="Dates">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start</p>
                <Input type="date" {...form.register("startDate")} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End</p>
                <Input type="date" {...form.register("endDate")} />
              </div>
            </div>
          </FormRow>

          {isEditing && (
            <FormRow label="Status" htmlFor="status">
              <Select
                value={form.watch("status") ?? "PLANNING"}
                onValueChange={(val) =>
                  form.setValue("status", val as CreateProjectInput["status"])
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          )}

          <FormRow label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              {...form.register("notes")}
            />
          </FormRow>

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
  );
}
