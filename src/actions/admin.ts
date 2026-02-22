"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validators/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserListParams {
  search?: string;
  roleId?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// getUsers
// ---------------------------------------------------------------------------

export async function getUsers(
  params?: UserListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("users:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.roleId) {
      where.roleId = params.roleId;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch users" };
  }
}

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------

export async function getUserById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("users:read");

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!user) {
      return { error: "User not found" };
    }

    return { data: user };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch user" };
  }
}

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

export async function createUser(
  data: CreateUserInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("users:create");

    const parsed = createUserSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingEmail) {
      return { error: "A user with this email already exists" };
    }

    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
    });

    if (!role) {
      return { error: "Role not found" };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        roleId: parsed.data.roleId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return { data: user };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to create user" };
  }
}

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("users:update");

    const parsed = updateUserSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return { error: "User not found" };
    }

    // Check email uniqueness if changing email
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (duplicate) {
        return { error: "A user with this email already exists" };
      }
    }

    // Check role exists if changing role
    if (parsed.data.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: parsed.data.roleId },
      });
      if (!role) {
        return { error: "Role not found" };
      }
    }

    // Build update payload, hashing password if provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.roleId !== undefined) updateData.roleId = parsed.data.roleId;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;

    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(
        parsed.data.password,
        SALT_ROUNDS
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return { data: user };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to update user" };
  }
}

// ---------------------------------------------------------------------------
// deleteUser (soft delete -> active = false)
// ---------------------------------------------------------------------------

export async function deleteUser(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("users:delete");

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return { error: "User not found" };
    }

    if (!existing.active) {
      return { error: "User is already deactivated" };
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        updatedAt: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return { data: user };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to delete user" };
  }
}

// ---------------------------------------------------------------------------
// getRoles
// ---------------------------------------------------------------------------

export async function getRoles(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("roles:read");

    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { permissions: true, users: true } },
      },
      orderBy: { name: "asc" },
    });

    return { data: roles };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch roles" };
  }
}

// ---------------------------------------------------------------------------
// getRoleById
// ---------------------------------------------------------------------------

export async function getRoleById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("roles:read");

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return { error: "Role not found" };
    }

    return { data: role };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return { error: error instanceof Error ? error.message : "Failed to fetch role" };
  }
}

// ---------------------------------------------------------------------------
// updateRolePermissions
// ---------------------------------------------------------------------------

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("roles:update");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return { error: "Role not found" };
    }

    if (role.isSystem && role.name === "Admin") {
      return { error: "Cannot modify permissions for the Admin role" };
    }

    // Validate that all permission IDs exist
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      return { error: "One or more permission IDs are invalid" };
    }

    // Replace all permissions in a transaction
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Remove existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }

      // Return the updated role with permissions
      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: { select: { users: true } },
        },
      });
    });

    return { data: updatedRole };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to update role permissions",
    };
  }
}
