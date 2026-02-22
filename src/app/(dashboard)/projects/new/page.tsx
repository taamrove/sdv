import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectForm } from "@/components/projects/project-form";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const themes = await prisma.theme.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Project" />
      <ProjectForm themes={themes} />
    </div>
  );
}
