"use client";

import { useSession } from "next-auth/react";
import { useServerSession } from "@/providers/server-session-provider";

export function usePermissions() {
  const { data: clientSession } = useSession();
  const serverUser = useServerSession();

  // Prefer client session (stays in sync), but fall back to server session
  // which is available immediately on first render (no async fetch).
  const user = clientSession?.user ?? serverUser;
  const permissions = user?.permissions ?? [];

  function hasPermission(perm: string): boolean {
    if (permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const [resource] = perm.split(":");
    if (permissions.includes(`${resource}:*`)) return true;
    return false;
  }

  return { permissions, hasPermission, user: user ?? null };
}
