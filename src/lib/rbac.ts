import { auth } from "./auth";
import type { PermissionString } from "./permissions";

export async function getSession() {
  return auth();
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function checkPermission(
  required: PermissionString
): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const perms = session.user.permissions;

  // Admin wildcard
  if (perms.includes("*")) return true;

  // Exact match
  if (perms.includes(required)) return true;

  // Resource wildcard (e.g., "items:*" grants all item actions)
  const [resource] = required.split(":");
  if (perms.includes(`${resource}:*`)) return true;

  return false;
}

export async function requirePermission(
  required: PermissionString
): Promise<void> {
  const hasPermission = await checkPermission(required);
  if (!hasPermission) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

export async function checkPermissions(
  required: PermissionString[]
): Promise<boolean> {
  for (const perm of required) {
    if (!(await checkPermission(perm))) return false;
  }
  return true;
}
