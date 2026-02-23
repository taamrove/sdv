import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getChangelog } from "@/actions/changelog";
import { ChangelogList } from "@/components/changelog/changelog-list";

export default async function ChangelogPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const result = await getChangelog();
  const entries = "data" in result ? result.data : [];

  const isAdmin =
    session.user.role === "Admin" || session.user.role === "Developer";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Changelog"
        description="Version history and release notes"
      />
      <ChangelogList
        entries={JSON.parse(JSON.stringify(entries))}
        canManage={isAdmin}
      />
    </div>
  );
}
