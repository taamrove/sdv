import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityLog } from "@/components/dashboard/activity-log";

interface SearchParams { page?: string }

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 30;
  const skip = (page - 1) * limit;

  const [entries, total, locations] = await Promise.all([
    prisma.itemHistory.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        item: {
          select: {
            humanReadableId: true,
            id: true,
            productId: true,
            product: { select: { name: true } },
          },
        },
        performedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.itemHistory.count(),
    prisma.warehouseLocation.findMany({ select: { id: true, label: true, zone: true } }),
  ]);

  const locationLabels = Object.fromEntries(
    locations.map((l) => [l.id, [l.zone, l.label].filter(Boolean).join(" / ")])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Full history of item changes across the system"
      />
      <ActivityLog
        entries={entries.map((e) => ({
          id: e.id,
          action: e.action,
          createdAt: e.createdAt.toISOString(),
          details: typeof e.details === "string" ? e.details : null,
          previousState: (e.previousState ?? null) as Record<string, unknown> | null,
          newState: (e.newState ?? null) as Record<string, unknown> | null,
          item: e.item,
          performedBy: e.performedBy,
        }))}
        locationLabels={locationLabels}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      />
    </div>
  );
}
