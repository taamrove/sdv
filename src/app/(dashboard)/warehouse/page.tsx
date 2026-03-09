import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WarehouseList } from "@/components/warehouse/warehouse-list";
import { WarehouseLocationList } from "@/components/warehouse/location-list";

export default async function WarehousePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [warehouses, locations] = await Promise.all([
    prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { locations: true } } },
    }),
    prisma.warehouseLocation.findMany({
      orderBy: { label: "asc" },
      include: {
        _count: { select: { items: true } },
        warehouse: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Warehouse"
        description="Manage warehouses and storage locations"
      />

      {/* Warehouses section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Warehouses</h2>
        <WarehouseList warehouses={warehouses} />
      </div>

      {/* Locations section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Locations</h2>
        <WarehouseLocationList
          locations={locations}
          warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        />
      </div>
    </div>
  );
}
