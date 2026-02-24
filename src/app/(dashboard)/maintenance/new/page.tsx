import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TicketForm } from "@/components/maintenance/ticket-form";

export default async function NewMaintenanceTicketPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const items = await prisma.item.findMany({
    where: {
      status: { notIn: ["MAINTENANCE", "RETIRED", "LOST"] },
    },
    select: {
      id: true,
      humanReadableId: true,
      product: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { humanReadableId: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Maintenance Ticket" />
      <TicketForm items={items} />
    </div>
  );
}
