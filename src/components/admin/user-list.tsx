"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { deleteUser, updateUser } from "@/actions/admin";
import { Plus, Pencil, Trash2, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFullName } from "@/lib/format-name";

interface User {
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

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { permissions: number; users: number };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserListProps {
  users: User[];
  roles: Role[];
  pagination: PaginationData;
}

export function UserList({ users, roles, pagination }: UserListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  function applyFilters() {
    const sp = new URLSearchParams(searchParams.toString());
    if (search) {
      sp.set("search", search);
    } else {
      sp.delete("search");
    }
    if (statusFilter !== "all") {
      sp.set("status", statusFilter);
    } else {
      sp.delete("status");
    }
    sp.set("page", "1");
    router.push(`?${sp.toString()}`);
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteUser(deleteTarget.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`User "${getFullName(deleteTarget)}" has been deactivated`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to deactivate user");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleReactivate(user: User) {
    try {
      const result = await updateUser(user.id, { active: true });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`User "${getFullName(user)}" has been reactivated`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to reactivate user");
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex gap-2 flex-1 max-w-lg">
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  // Auto-apply when filter changes
                  const sp = new URLSearchParams(searchParams.toString());
                  if (search) sp.set("search", search);
                  else sp.delete("search");
                  if (value !== "all") sp.set("status", value);
                  else sp.delete("status");
                  sp.set("page", "1");
                  router.push(`?${sp.toString()}`);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={applyFilters}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className={cn(!user.active && "opacity-50")}>
                    <TableCell className="font-medium">{getFullName(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user.active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReactivate(user)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination {...pagination} />
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        roles={roles}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Deactivate User"
        description={`Are you sure you want to deactivate "${deleteTarget ? getFullName(deleteTarget) : ""}"? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
