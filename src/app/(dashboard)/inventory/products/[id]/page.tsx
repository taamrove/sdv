import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ItemForm } from "@/components/inventory/product-form";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [item, categories] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        categoryId: true,
        imageUrl: true,
        size: true,
        allowsSizeFlexibility: true,
      },
    }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);

  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Item" description={item.name} />
      <ItemForm categories={categories} item={item} />
    </div>
  );
}
