import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ContainerDetail } from "@/components/containers/container-detail";

export default async function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [container, projects] = await Promise.all([
    prisma.container.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        items: {
          include: {
            piece: {
              include: {
                item: true,
                category: true,
                warehouseLocation: true,
              },
            },
            packedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            verifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { packedAt: "desc" },
        },
      },
    }),
    prisma.project.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!container) notFound();

  // Serialize dates and fields for client component
  const serializedContainer = {
    id: container.id,
    name: container.name,
    type: container.type as string,
    status: container.status as string,
    description: container.description,
    notes: container.notes,
    projectId: container.projectId,
    project: container.project,
    items: container.items.map((ci) => ({
      id: ci.id,
      packedAt: ci.packedAt.toISOString(),
      piece: {
        id: ci.piece.id,
        humanReadableId: ci.piece.humanReadableId,
        status: ci.piece.status as string,
        condition: ci.piece.condition as string,
        color: ci.piece.color,
        item: { name: ci.piece.item.name },
        category: { code: ci.piece.category.code, name: ci.piece.category.name },
        warehouseLocation: ci.piece.warehouseLocation
          ? { label: ci.piece.warehouseLocation.label }
          : null,
      },
      packedBy: ci.packedBy
        ? { id: ci.packedBy.id, firstName: ci.packedBy.firstName, lastName: ci.packedBy.lastName }
        : null,
    })),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Container" description={container.name} />
      <ContainerDetail
        container={serializedContainer}
        projects={projects}
      />
    </div>
  );
}
