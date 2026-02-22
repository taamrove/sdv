import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/actions/categories";
import { getQuarantineDefaults } from "@/actions/quarantine-defaults";
import { QuarantineDefaultsForm } from "@/components/admin/quarantine-defaults-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryRow {
  id: string;
  code: string;
  name: string;
}

interface QuarantineDefaultRow {
  id: string;
  categoryId: string;
  severity: string;
  defaultQuarantineDays: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function QuarantineDefaultsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [categoriesResult, defaultsResult] = await Promise.all([
    getCategories(),
    getQuarantineDefaults(),
  ]);

  const categories =
    "data" in categoriesResult
      ? (categoriesResult.data as CategoryRow[])
      : [];
  const defaults =
    "data" in defaultsResult
      ? (defaultsResult.data as QuarantineDefaultRow[])
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quarantine Defaults"
        description="Configure default quarantine periods per category and severity level"
      />
      <QuarantineDefaultsForm
        categories={categories}
        defaults={defaults}
      />
    </div>
  );
}
