import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { getActivityFeed } from "@/actions/activity";

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

  const result = await getActivityFeed(page, limit);
  if ("error" in result) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Activity Log"
          description="Full history of changes across the system"
        />
        <p className="text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Full history of changes across the system"
      />
      <ActivityLog
        entries={result.data}
        pagination={result.pagination}
      />
    </div>
  );
}
