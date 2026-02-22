"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, ShoppingBag, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";

interface Project {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  status: string;
  _count: { assignments: number; bookings: number };
}

interface ProjectListProps {
  projects: Project[];
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACTIVE":
    case "IN_TRANSIT":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyFilters(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    router.push(`?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ status: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a project to start planning shows and events.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant={statusVariant(project.status)}>
                    {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.startDate)}
                        {project.endDate && ` - ${formatDate(project.endDate)}`}
                      </div>
                    )}
                    {(project.venue || project.city) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[project.venue, project.city, project.country]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project._count.assignments} performer{project._count.assignments !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {project._count.bookings} booking{project._count.bookings !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
