import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { RoleList } from "@/components/admin/role-list";
import { getRoles } from "@/actions/admin";

export default async function RolesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const result = await getRoles();
  const roles = "data" in result ? result.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage roles and their permissions"
      />
      <RoleList roles={roles as RoleItem[]} />
    </div>
  );
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { permissions: number; users: number };
}
