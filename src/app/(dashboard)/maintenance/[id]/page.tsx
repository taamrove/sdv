import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TicketDetail } from "@/components/maintenance/ticket-detail";

export default async function MaintenanceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [ticket, users] = await Promise.all([
    prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        piece: {
          select: {
            id: true,
            humanReadableId: true,
            status: true,
            item: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            warehouseLocation: { select: { id: true, label: true } },
          },
        },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        photos: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance Ticket" description={ticket.title} />
      <TicketDetail ticket={ticket} users={users} />
    </div>
  );
}
