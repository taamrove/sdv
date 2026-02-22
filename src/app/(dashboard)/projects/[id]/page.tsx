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
            performer: true,
          },
          orderBy: { performer: { name: "asc" } },
        },
        bookings: {
          include: {
            product: true,
            pieces: {
              include: {
                piece: {
                  include: {
                    item: true,
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
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  if (!project) notFound();

  // Find pieces with potential conflicts (assigned to overlapping projects)
  const pieceIds = project.bookings.flatMap((b) =>
    b.pieces.map((bp) => bp.piece.id)
  );

  let conflictPieceIds: string[] = [];
  if (pieceIds.length > 0 && project.startDate && project.endDate) {
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
            pieces: {
              where: { pieceId: { in: pieceIds } },
              select: { pieceId: true },
            },
          },
        },
      },
    });

    conflictPieceIds = overlappingProjects.flatMap((p) =>
      p.bookings.flatMap((b) => b.pieces.map((bp) => bp.pieceId))
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Project" description={project.name} />
      <ProjectDetail
        project={project}
        themes={themes}
        allPerformers={allPerformers}
        conflictPieceIds={conflictPieceIds}
      />
    </div>
  );
}
