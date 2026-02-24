import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WarehouseLocationList } from "@/components/warehouse/location-list";

export default async function WarehousePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const locations = await prisma.warehouseLocation.findMany({
    orderBy: { label: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Locations"
        description="Manage storage locations for inventory items"
      />
      <WarehouseLocationList locations={locations} />
    </div>
  );
}
