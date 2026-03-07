import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectDetail } from "@/components/projects/project-detail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [project, themes, allPerformers] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            performer: { include: { contact: true } },
            bookingNotes: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: [
            { performer: { contact: { lastName: "asc" } } },
            { performer: { contact: { firstName: "asc" } } },
          ],
        },
        bookings: {
          include: {
            kit: true,
            items: {
              include: {
                item: {
                  include: {
                    product: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.theme.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.performer.findMany({
      where: { active: true },
      orderBy: [{ contact: { lastName: "asc" } }, { contact: { firstName: "asc" } }],
      select: {
        id: true,
        type: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  if (!project) notFound();

  // Find items with potential conflicts (assigned to overlapping projects)
  const itemIds = project.bookings.flatMap((b) =>
    b.items.map((bi) => bi.item.id)
  );

  let conflictItemIds: string[] = [];
  if (itemIds.length > 0 && project.startDate && project.endDate) {
    const overlappingProjects = await prisma.project.findMany({
      where: {
        id: { not: project.id },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        startDate: { lte: project.endDate },
        endDate: { gte: project.startDate },
      },
      select: {
        bookings: {
          select: {
            items: {
              where: { itemId: { in: itemIds } },
              select: { itemId: true },
            },
          },
        },
      },
    });

    conflictItemIds = overlappingProjects.flatMap((p) =>
      p.bookings.flatMap((b) => b.items.map((bi) => bi.itemId))
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Project" description={project.name} />
      <ProjectDetail
        project={project}
        themes={themes}
        allPerformers={allPerformers}
        conflictItemIds={conflictItemIds}
      />
    </div>
  );
}
