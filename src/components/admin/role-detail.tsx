"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { updateRolePermissions } from "@/actions/admin";
import { Save, Shield, Users } from "lucide-react";

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface RolePermission {
  permissionId: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermission[];
  _count: { users: number };
}

interface RoleDetailProps {
  role: Role;
  allPermissions: Permission[];
}

export function RoleDetail({ role, allPermissions }: RoleDetailProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const currentPermissionIds = useMemo(
    () => new Set(role.permissions.map((rp) => rp.permissionId)),
    [role.permissions]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(currentPermissionIds)
  );

  const isAdminSystem = role.isSystem && role.name === "Admin";

  // Group permissions by resource
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const perm of allPermissions) {
      const existing = map.get(perm.resource) ?? [];
      existing.push(perm);
      map.set(perm.resource, existing);
    }
    return map;
  }, [allPermissions]);

  // Collect all unique actions across resources, in order
  const allActions = useMemo(() => {
    const actionSet = new Set<string>();
    for (const perm of allPermissions) {
      actionSet.add(perm.action);
    }
    return Array.from(actionSet);
  }, [allPermissions]);

  const resources = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  function togglePermission(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleResource(resource: string) {
    const perms = grouped.get(resource) ?? [];
    const allSelected = perms.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const perm of perms) {
        if (allSelected) {
          next.delete(perm.id);
        } else {
          next.add(perm.id);
        }
      }
      return next;
    });
  }

  function toggleAll() {
    const allSelected = allPermissions.every((p) => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPermissions.map((p) => p.id)));
    }
  }

  const hasChanges = useMemo(() => {
    if (selectedIds.size !== currentPermissionIds.size) return true;
    for (const id of selectedIds) {
      if (!currentPermissionIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, currentPermissionIds]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateRolePermissions(
        role.id,
        Array.from(selectedIds)
      );
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Permissions updated successfully");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {role.name}
                {role.isSystem && <Badge variant="secondary">System</Badge>}
              </CardTitle>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                <span>{selectedIds.size} permissions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>
                  {role._count.users} user{role._count.users !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Permissions</CardTitle>
            <div className="flex items-center gap-2">
              {!isAdminSystem && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                  >
                    {allPermissions.every((p) => selectedIds.has(p.id))
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </div>
          </div>
          {isAdminSystem && (
            <CardDescription>
              The Admin role has all permissions and cannot be modified.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Resource</TableHead>
                  {allActions.map((action) => (
                    <TableHead key={action} className="text-center capitalize">
                      {action}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => {
                  const perms = grouped.get(resource) ?? [];
                  const permsByAction = new Map(
                    perms.map((p) => [p.action, p])
                  );
                  const allResourceSelected = perms.every((p) =>
                    selectedIds.has(p.id)
                  );

                  return (
                    <TableRow key={resource}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium capitalize hover:underline cursor-pointer"
                          onClick={() => !isAdminSystem && toggleResource(resource)}
                          disabled={isAdminSystem}
                        >
                          {resource}
                        </button>
                        {!isAdminSystem && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {allResourceSelected ? "(all)" : ""}
                          </span>
                        )}
                      </TableCell>
                      {allActions.map((action) => {
                        const perm = permsByAction.get(action);
                        if (!perm) {
                          return (
                            <TableCell
                              key={action}
                              className="text-center text-muted-foreground"
                            >
                              <span className="text-xs">--</span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={action} className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={
                                  isAdminSystem || selectedIds.has(perm.id)
                                }
                                onCheckedChange={() =>
                                  togglePermission(perm.id)
                                }
                                disabled={isAdminSystem}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
