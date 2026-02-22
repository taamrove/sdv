import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AvailabilityDashboard } from "@/components/inventory/availability-dashboard";
import { getAvailabilityByItem } from "@/actions/availability";

interface SearchParams {
  categoryId?: string;
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;

  const [availabilityResult, categories] = await Promise.all([
    getAvailabilityByItem(
      params.categoryId ? { categoryId: params.categoryId } : undefined
    ),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);

  const groups = "data" in availabilityResult ? availabilityResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="Overview of piece availability by item type"
      />
      <AvailabilityDashboard groups={groups} categories={categories} />
    </div>
  );
}
