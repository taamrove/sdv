import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductDetail } from "@/components/inventory/product-detail";
import { ItemStatus, Prisma } from "@prisma/client";

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  external?: string;
  noLocation?: string;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      _count: { select: { items: true } },
    },
  });

  if (!product) notFound();

  // Build item filters scoped to this product
  const itemWhere: Prisma.ItemWhereInput = { productId: id };
  if (sp.search) {
    itemWhere.OR = [
      { humanReadableId: { contains: sp.search, mode: "insensitive" } },
      { product: { name: { contains: sp.search, mode: "insensitive" } } },
    ];
  }
  if (sp.status) {
    itemWhere.status = sp.status as ItemStatus;
  }
  if (sp.external === "true") {
    itemWhere.isExternal = true;
  }
  if (sp.noLocation === "true") {
    itemWhere.warehouseLocationId = null;
    itemWhere.isExternal = false;
  }

  const [rawItems, itemTotal, categories] = await Promise.all([
    prisma.item.findMany({
      where: itemWhere,
      include: {
        product: true,
        category: true,
        warehouseLocation: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.item.count({ where: itemWhere }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);

  // Serialize Decimal to number for client component
  const items = rawItems.map((item) => ({
    ...item,
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
  }));

  const productCode = `${product.category.code}-${String(product.number).padStart(3, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${productCode} — ${product.category.name}`}
      />
      <ProductDetail
        product={product}
        items={items}
        categories={categories}
        pagination={{
          page,
          limit,
          total: itemTotal,
          totalPages: Math.ceil(itemTotal / limit),
        }}
      />
    </div>
  );
}
