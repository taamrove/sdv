import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PieceDetail } from "@/components/inventory/item-detail";

export default async function PieceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const piece = await prisma.piece.findUnique({
    where: { id },
    include: {
      item: true,
      category: true,
      warehouseLocation: true,
    },
  });

  if (!piece) notFound();

  const history = await prisma.pieceHistory.findMany({
    where: { pieceId: id },
    include: { performedBy: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const locations = await prisma.warehouseLocation.findMany({
    orderBy: { label: "asc" },
  });

  // Fetch active project bookings for this piece
  const bookingPieces = await prisma.bookingPiece.findMany({
    where: {
      pieceId: id,
      booking: {
        project: {
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      },
    },
    include: {
      booking: {
        include: {
          product: { select: { name: true } },
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

  const serializedBookings = bookingPieces.map((bp) => ({
    bookingPieceId: bp.id,
    productName: bp.booking.product.name,
    projectId: bp.booking.project.id,
    projectName: bp.booking.project.name,
    projectStatus: bp.booking.project.status,
    startDate: bp.booking.project.startDate?.toISOString() ?? null,
    endDate: bp.booking.project.endDate?.toISOString() ?? null,
  }));

  // Serialize Decimal to number for client component
  const serializedPiece = {
    ...piece,
    purchasePrice: piece.purchasePrice ? Number(piece.purchasePrice) : null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={piece.humanReadableId}
        description={`${piece.item.name} — ${piece.category.name}`}
      />
      <PieceDetail
        piece={serializedPiece}
        history={history}
        locations={locations}
        bookings={serializedBookings}
      />
    </div>
  );
}
