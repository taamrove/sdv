import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductList } from "@/components/inventory/product-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SearchParams {
  page?: string;
  search?: string;
  categoryId?: string;
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

  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        subCategory: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ category: { code: "asc" } }, { number: "asc" }],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Product catalog and item management"
        action={
          <Link href="/inventory/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          </Link>
        }
      />
      <ProductList
        products={products}
        categories={categories}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      />
    </div>
  );
}
