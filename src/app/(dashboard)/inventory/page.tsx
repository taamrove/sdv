import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ItemList } from "@/components/inventory/item-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ItemStatus, Prisma } from "@prisma/client";

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

  const where: Prisma.ItemWhereInput = {};
  if (params.search) {
    where.OR = [
      { humanReadableId: { contains: params.search, mode: "insensitive" } },
      { product: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }
  if (params.status) {
    where.status = params.status as ItemStatus;
  }

  const [rawItems, total, categories] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        product: true,
        category: true,
        warehouseLocation: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.item.count({ where }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);

  // Serialize Decimal to number for client component
  const items = rawItems.map((item) => ({
    ...item,
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="All items in the system"
        action={
          <Link href="/inventory/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Item
            </Button>
          </Link>
        }
      />
      <ItemList
        items={items}
        categories={categories}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      />
    </div>
  );
}
