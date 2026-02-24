import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ItemForm } from "@/components/inventory/item-form";

export default async function NewItemPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [products, locations] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category: { code: "asc" } }, { number: "asc" }],
    }),
    prisma.warehouseLocation.findMany({
      orderBy: { label: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Item"
        description="Add a new item to the inventory"
      />
      <ItemForm products={products} locations={locations} />
    </div>
  );
}
