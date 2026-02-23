import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { UserList } from "@/components/admin/user-list";
import { getUsers, getRoles } from "@/actions/admin";

interface SearchParams {
  page?: string;
  search?: string;
  roleId?: string;
  status?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 20;

  const [usersResult, rolesResult] = await Promise.all([
    getUsers({
      search: params.search,
      roleId: params.roleId,
      status: params.status,
      page,
      limit,
    }),
    getRoles(),
  ]);

  const users = "data" in usersResult ? usersResult.data : [];
  const pagination =
    "pagination" in usersResult
      ? usersResult.pagination
      : { page: 1, limit: 20, total: 0, totalPages: 0 };
  const roles = "data" in rolesResult ? rolesResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and access"
      />
      <UserList
        users={users as UserRow[]}
        roles={roles as RoleOption[]}
        pagination={pagination}
      />
    </div>
  );
}

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string };
}

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { permissions: number; users: number };
}
