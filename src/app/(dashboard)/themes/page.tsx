import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeList } from "@/components/themes/theme-list";

export default async function ThemesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const themes = await prisma.theme.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { kits: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Themes"
        description="Manage costume themes and linked kits"
      />
      <ThemeList themes={themes} />
    </div>
  );
}
