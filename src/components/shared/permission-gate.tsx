"use client";

import { usePermissions } from "@/hooks/use-permissions";

interface PermissionGateProps {
  /** The permission string to check, e.g. "inventory:read" */
  permission: string;
  /** Content to render when the user has the permission */
  children: React.ReactNode;
  /** Optional fallback to render when the user lacks the permission */
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
