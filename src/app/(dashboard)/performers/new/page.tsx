import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PerformerForm } from "@/components/performers/performer-form";

export default async function NewPerformerPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader title="New Performer" />
      <PerformerForm />
    </div>
  );
}
