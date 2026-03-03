import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryList } from "@/components/inventory/category-list";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const categories = await prisma.category.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { products: true, items: true } },
    subCategories: { orderBy: [{ order: "asc" }, { name: "asc" }] },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage product categories (Costume, Shoes, Hat, etc.)"
      />
      <CategoryList categories={categories} />
    </div>
  );
}
