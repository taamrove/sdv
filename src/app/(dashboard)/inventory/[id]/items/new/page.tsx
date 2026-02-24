import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ItemForm } from "@/components/inventory/item-form";

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  // Verify the product exists
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) notFound();

  const locations = await prisma.warehouseLocation.findMany({
    orderBy: { label: "asc" },
  });

  const productCode = `${product.category.code}-${String(product.number).padStart(3, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Item"
        description={`Add a new item to ${product.name} (${productCode})`}
      />
      <ItemForm
        products={[product]}
        locations={locations}
        defaultProductId={id}
      />
    </div>
  );
}
