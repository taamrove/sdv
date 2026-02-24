import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeDetail } from "@/components/themes/theme-detail";

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const theme = await prisma.theme.findUnique({
    where: { id },
    include: {
      kits: {
        include: {
          kit: {
            include: { variants: true },
          },
        },
      },
    },
  });

  if (!theme) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Theme" description={theme.name} />
      <ThemeDetail theme={theme} />
    </div>
  );
}
