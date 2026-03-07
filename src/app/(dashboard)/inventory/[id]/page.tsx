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
  archived?: string;
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
      subCategory: true,
      _count: { select: { items: true } },
    },
  });

  if (!product) notFound();

  // Build item filters scoped to this product
  const itemWhere: Prisma.ItemWhereInput = {
    productId: id,
    archived: sp.archived === "true" ? undefined : false,
  };
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

  const [rawItems, itemTotal, categories, recentHistory, locations] = await Promise.all([
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
    prisma.itemHistory.findMany({
      where: { item: { productId: id } },
      select: {
        id: true,
        action: true,
        createdAt: true,
        details: true,
        previousState: true,
        newState: true,
        performedBy: { select: { firstName: true, lastName: true } },
        item: {
          select: {
            id: true,
            humanReadableId: true,
            productId: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.warehouseLocation.findMany({ select: { id: true, label: true } }),
  ]);

  // Serialize Decimal to number for client component
  const items = rawItems.map((item) => ({
    ...item,
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
  }));

  const locationLabels = Object.fromEntries(locations.map((l) => [l.id, l.label]));

  const serializedHistory = recentHistory.map((e) => ({
    id: e.id,
    action: e.action,
    createdAt: e.createdAt.toISOString(),
    details: typeof e.details === "string" ? e.details : null,
    previousState: (e.previousState ?? null) as Record<string, unknown> | null,
    newState: (e.newState ?? null) as Record<string, unknown> | null,
    item: e.item,
    performedBy: e.performedBy,
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
        recentActivity={serializedHistory}
        locationLabels={locationLabels}
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
