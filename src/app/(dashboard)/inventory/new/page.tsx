import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PieceForm } from "@/components/inventory/item-form";

export default async function NewPiecePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [items, locations] = await Promise.all([
    prisma.item.findMany({
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
        title="New Piece"
        description="Add a new piece to the inventory"
      />
      <PieceForm items={items} locations={locations} />
    </div>
  );
}
