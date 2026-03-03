import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/inventory/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [product, categories, subCategories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        categoryId: true,
        subCategoryId: true,
        imageUrl: true,
        allowsSizeFlexibility: true,
      },
    }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
    prisma.subCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${product.name}`} description="Edit product details" />
      <ProductForm categories={categories} subCategories={subCategories} product={product} />
    </div>
  );
}
