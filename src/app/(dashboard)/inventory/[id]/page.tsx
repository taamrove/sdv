import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ItemDetail } from "@/components/inventory/item-detail";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      product: true,
      category: true,
      warehouseLocation: true,
    },
  });

  if (!item) notFound();

  const history = await prisma.itemHistory.findMany({
    where: { itemId: id },
    include: { performedBy: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const locations = await prisma.warehouseLocation.findMany({
    orderBy: { label: "asc" },
  });

  // Fetch active project bookings for this item
  const bookingItems = await prisma.bookingItem.findMany({
    where: {
      itemId: id,
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
  });

  const serializedBookings = bookingItems.map((bi) => ({
    bookingItemId: bi.id,
    kitName: bi.booking.kit.name,
    projectId: bi.booking.project.id,
    projectName: bi.booking.project.name,
    projectStatus: bi.booking.project.status,
    startDate: bi.booking.project.startDate?.toISOString() ?? null,
    endDate: bi.booking.project.endDate?.toISOString() ?? null,
  }));

  // Serialize Decimal to number for client component
  const serializedItem = {
    ...item,
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.humanReadableId}
        description={`${item.product.name} — ${item.category.name}`}
      />
      <ItemDetail
        item={serializedItem}
        history={history}
        locations={locations}
        bookings={serializedBookings}
      />
    </div>
  );
}
