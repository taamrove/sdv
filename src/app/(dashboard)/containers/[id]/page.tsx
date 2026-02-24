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
            item: {
              include: {
                product: true,
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
      item: {
        id: ci.item.id,
        humanReadableId: ci.item.humanReadableId,
        status: ci.item.status as string,
        condition: ci.item.condition as string,
        color: ci.item.color,
        product: { name: ci.item.product.name },
        category: { code: ci.item.category.code, name: ci.item.category.name },
        warehouseLocation: ci.item.warehouseLocation
          ? { label: ci.item.warehouseLocation.label }
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
