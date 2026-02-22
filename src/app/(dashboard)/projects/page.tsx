import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectList } from "@/components/projects/project-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectStatus } from "@prisma/client";

interface SearchParams {
  status?: string;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.status) {
    where.status = params.status as ProjectStatus;
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: {
        select: { assignments: true, bookings: true },
      },
    },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Shows, tours, and events"
        action={
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        }
      />
      <ProjectList projects={projects} />
    </div>
  );
}
