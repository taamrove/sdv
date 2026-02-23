import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { FeedbackAdminList } from "@/components/feedback/feedback-admin-list";
import { getFeedback } from "@/actions/feedback";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminFeedbackPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  // Only Developer role can access
  if (session.user.role !== "Developer") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const status = params.status;
  const category = params.category;
  const search = params.search;

  const result = await getFeedback({ page, status, category, search });

  if ("error" in result) {
    return (
      <div className="space-y-6">
        <PageHeader title="Feedback Management" />
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback Management"
        description="Review and manage user feedback"
      />
      <FeedbackAdminList
        feedback={JSON.parse(JSON.stringify(result.data))}
        pagination={result.pagination}
      />
    </div>
  );
}
