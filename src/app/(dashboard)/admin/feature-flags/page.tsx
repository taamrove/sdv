import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { FeatureFlagList } from "@/components/admin/feature-flag-list";
import { getFeatureFlags } from "@/actions/feature-flags";

export default async function FeatureFlagsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const result = await getFeatureFlags();
  const flags = "data" in result ? result.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags"
        description="Manage feature rollout stages and beta access"
      />
      <FeatureFlagList flags={flags as FeatureFlagRow[]} />
    </div>
  );
}

interface FeatureFlagRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  stage: "ALPHA" | "BETA" | "PRODUCTION";
  createdAt: string;
  updatedAt: string;
  _count: { betaUsers: number };
}
