import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TicketList } from "@/components/maintenance/ticket-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;

  const status = typeof params.status === "string" ? params.status : undefined;
  const priority =
    typeof params.priority === "string" ? params.priority : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const limit = 12;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      {
        item: {
          humanReadableId: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            humanReadableId: true,
            product: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { photos: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.maintenanceTicket.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Track and manage item repairs"
        action={
          <Link href="/maintenance/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Ticket
            </Button>
          </Link>
        }
      />
      <TicketList
        tickets={tickets}
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
