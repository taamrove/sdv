import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/inventory/product-form";

export default async function NewProductPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const categories = await prisma.category.findMany({
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Product" />
      <ProductForm categories={categories} />
    </div>
  );
}
