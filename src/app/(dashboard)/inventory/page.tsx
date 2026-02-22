import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PieceList } from "@/components/inventory/item-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PieceStatus, Prisma } from "@prisma/client";

interface SearchParams {
  page?: string;
  search?: string;
  categoryId?: string;
  status?: string;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Prisma.PieceWhereInput = {};
  if (params.search) {
    where.OR = [
      { humanReadableId: { contains: params.search, mode: "insensitive" } },
      { item: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }
  if (params.status) {
    where.status = params.status as PieceStatus;
  }

  const [rawPieces, total, categories] = await Promise.all([
    prisma.piece.findMany({
      where,
      include: {
        item: true,
        category: true,
        warehouseLocation: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.piece.count({ where }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);

  // Serialize Decimal to number for client component
  const pieces = rawPieces.map((piece) => ({
    ...piece,
    purchasePrice: piece.purchasePrice ? Number(piece.purchasePrice) : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pieces"
        description="All pieces in the system"
        action={
          <Link href="/inventory/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Piece
            </Button>
          </Link>
        }
      />
      <PieceList
        pieces={pieces}
        categories={categories}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      />
    </div>
  );
}
