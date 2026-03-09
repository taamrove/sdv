import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ItemDetail } from "@/components/inventory/item-detail";
import { getEntityActivity } from "@/actions/activity";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: productId, itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      product: {
        include: { subCategory: true },
      },
      category: true,
      warehouseLocation: { include: { warehouse: true } },
      mainPerformer: {
        select: {
          id: true,
          contact: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!item || item.productId !== productId) notFound();

  // Run independent queries in parallel
  const [activityResult, locations, warehouses, bookingItems, performers] = await Promise.all([
    getEntityActivity([{ entityType: "Item", entityId: itemId }], 50),
    prisma.warehouseLocation.findMany({
      orderBy: { label: "asc" },
      include: { warehouse: true },
    }),
    prisma.warehouse.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.bookingItem.findMany({
      where: {
        itemId,
        booking: {
          project: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        },
      },
      include: {
        booking: {
          include: {
            kit: { select: { name: true } },
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
      orderBy: { booking: { project: { startDate: "asc" } } },
    }),
    prisma.performer.findMany({
      where: { active: true },
      orderBy: [{ contact: { lastName: "asc" } }, { contact: { firstName: "asc" } }],
      select: {
        id: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const history = "data" in activityResult ? activityResult.data : [];

  const serializedBookings = bookingItems.map((bi) => ({
    bookingItemId: bi.id,
    kitName: bi.booking.kit.name,
    projectId: bi.booking.project.id,
    projectName: bi.booking.project.name,
    projectStatus: bi.booking.project.status,
    startDate: bi.booking.project.startDate?.toISOString() ?? null,
    endDate: bi.booking.project.endDate?.toISOString() ?? null,
  }));

  const sizeMode = item.product.subCategory?.sizeMode ?? null;

  // Serialize Decimal to number and shape for client component
  const serializedItem = {
    id: item.id,
    humanReadableId: item.humanReadableId,
    status: item.status,
    condition: item.condition,
    color: item.color,
    sizes: item.sizes,
    notes: item.notes,
    purchaseDate: item.purchaseDate,
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
    imageUrl: item.imageUrl,
    archived: item.archived,
    createdAt: item.createdAt,
    product: { id: item.product.id, name: item.product.name, number: item.product.number },
    category: { id: item.category.id, code: item.category.code, name: item.category.name },
    subCategory: item.product.subCategory
      ? { name: item.product.subCategory.name }
      : null,
    warehouseLocation: item.warehouseLocation
      ? {
          id: item.warehouseLocation.id,
          warehouse: item.warehouseLocation.warehouse
            ? { id: item.warehouseLocation.warehouse.id, name: item.warehouseLocation.warehouse.name }
            : null,
          room: item.warehouseLocation.room,
          zone: item.warehouseLocation.zone,
          rack: item.warehouseLocation.rack,
          shelf: item.warehouseLocation.shelf,
          bin: item.warehouseLocation.bin,
          label: item.warehouseLocation.label,
        }
      : null,
    mainPerformer: item.mainPerformer
      ? {
          id: item.mainPerformer.id,
          firstName: item.mainPerformer.contact.firstName,
          lastName: item.mainPerformer.contact.lastName,
        }
      : null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${item.humanReadableId} — ${item.product.name}`}
        description={`${item.category.name}${item.product.subCategory ? ` · ${item.product.subCategory.name}` : ""}`}
      />
      <ItemDetail
        item={serializedItem}
        history={history}
        locations={locations}
        warehouses={warehouses}
        bookings={serializedBookings}
        sizeMode={sizeMode}
        performers={performers.map((p) => ({
          id: p.id,
          firstName: p.contact.firstName,
          lastName: p.contact.lastName,
        }))}
      />
    </div>
  );
}
