import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/inventory/product-form";

export default async function NewProductPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [categories, subCategories] = await Promise.all([
    prisma.category.findMany({ orderBy: { code: "asc" } }),
    prisma.subCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="New Product" description="Create a new product type" />
      <ProductForm categories={categories} subCategories={subCategories} />
    </div>
  );
}
