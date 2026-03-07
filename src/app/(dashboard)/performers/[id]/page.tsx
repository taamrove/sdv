import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PerformerForm } from "@/components/performers/performer-form";
import { getFullName } from "@/lib/format-name";
import { CompactActivityLog } from "@/components/dashboard/activity-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEntityActivity } from "@/actions/activity";

export default async function EditPerformerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [performer, activityResult] = await Promise.all([
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
    getEntityActivity([{ entityType: "Performer", entityId: id }], 20),
  ]);

  if (!performer) notFound();

  const recentHistory = "data" in activityResult ? activityResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Performer"
        description={getFullName(performer.contact)}
      />
      <PerformerForm performer={performer} />

      {recentHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CompactActivityLog
              entries={recentHistory}
              defaultVisible={5}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
