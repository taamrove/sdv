import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PerformerForm } from "@/components/performers/performer-form";
import { getFullName } from "@/lib/format-name";

export default async function EditPerformerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const performer = await prisma.performer.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      sizes: true,
      notes: true,
      active: true,
      requiresExactSize: true,
      sizeFlexDirection: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!performer) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Performer"
        description={getFullName(performer.contact)}
      />
      <PerformerForm performer={performer} />
    </div>
  );
}
