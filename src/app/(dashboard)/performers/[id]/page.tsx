import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PerformerForm } from "@/components/performers/performer-form";
import { getFullName } from "@/lib/format-name";
import { CompactActivityLog, type ActivityEntry } from "@/components/dashboard/activity-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditPerformerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [performer, recentHistory, locations] = await Promise.all([
    prisma.performer.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        sizes: true,
        notes: true,
        active: true,
        requiresExactSize: true,
        sizeFlexDirection: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    }),
    prisma.itemHistory.findMany({
      where: { item: { mainPerformerId: id } },
      select: {
        id: true,
        action: true,
        createdAt: true,
        details: true,
        previousState: true,
        newState: true,
        performedBy: { select: { firstName: true, lastName: true } },
        item: {
          select: {
            id: true,
            humanReadableId: true,
            productId: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.warehouseLocation.findMany({ select: { id: true, label: true } }),
  ]);

  if (!performer) notFound();

  const locationLabels = Object.fromEntries(locations.map((l) => [l.id, l.label]));
  const serializedHistory: ActivityEntry[] = recentHistory.map((e) => ({
    id: e.id,
    action: e.action,
    createdAt: e.createdAt.toISOString(),
    details: typeof e.details === "string" ? e.details : null,
    previousState: (e.previousState ?? null) as Record<string, unknown> | null,
    newState: (e.newState ?? null) as Record<string, unknown> | null,
    item: e.item,
    performedBy: e.performedBy,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Performer"
        description={getFullName(performer.contact)}
      />
      <PerformerForm performer={performer} />

      {serializedHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent activity on assigned items
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CompactActivityLog
              entries={serializedHistory}
              locationLabels={locationLabels}
              defaultVisible={5}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
