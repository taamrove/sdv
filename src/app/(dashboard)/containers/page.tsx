import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ContainerList } from "@/components/containers/container-list";
import { ContainerStatus, ContainerType, Prisma } from "@prisma/client";

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  type?: string;
  projectId?: string;
}

export default async function ContainersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Prisma.ContainerWhereInput = {};
  if (params.search) {
    where.name = { contains: params.search, mode: "insensitive" };
  }
  if (params.status) {
    where.status = params.status as ContainerStatus;
  }
  if (params.type) {
    where.type = params.type as ContainerType;
  }
  if (params.projectId) {
    where.projectId = params.projectId;
  }

  const [containers, total, projects] = await Promise.all([
    prisma.container.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.container.count({ where }),
    prisma.project.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedContainers = containers.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    description: c.description,
    notes: c.notes,
    projectId: c.projectId,
    project: c.project,
    _count: c._count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Containers"
        description="Manage packing containers"
      />
      <ContainerList
        containers={serializedContainers}
        projects={projects}
        pagination={{
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }}
      />
    </div>
  );
}
