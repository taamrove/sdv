import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { getMyFeedback } from "@/actions/feedback";

export default async function FeedbackPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const result = await getMyFeedback();
  const feedback = "data" in result ? result.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="Share bug reports, feature requests, or improvement suggestions"
      />
      <FeedbackList feedback={JSON.parse(JSON.stringify(feedback))} />
    </div>
  );
}
