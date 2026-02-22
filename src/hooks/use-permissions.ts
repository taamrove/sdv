"use client";

import { useSession } from "next-auth/react";

export function usePermissions() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];

  function hasPermission(perm: string): boolean {
    if (permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const [resource] = perm.split(":");
    if (permissions.includes(`${resource}:*`)) return true;
    return false;
  }

  return { permissions, hasPermission, user: session?.user ?? null };
}
