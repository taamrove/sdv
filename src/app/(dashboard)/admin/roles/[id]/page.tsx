import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { RoleDetail } from "@/components/admin/role-detail";
import { getRoleById } from "@/actions/admin";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [roleResult, allPermissions] = await Promise.all([
    getRoleById(id),
    prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    }),
  ]);

  if ("error" in roleResult) notFound();

  const role = roleResult.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Details"
        description={(role as RoleData).name}
      />
      <RoleDetail
        role={role as RoleData}
        allPermissions={allPermissions as Permission[]}
      />
    </div>
  );
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: {
    permissionId: string;
    permission: Permission;
  }[];
  _count: { users: number };
}
