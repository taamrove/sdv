"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().max(300).optional(),
  description: z.string().max(500).optional(),
});

const updateWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  address: z.string().max(300).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

type ActionResult<T> = { data: T } | { error: string };

// ---------------------------------------------------------------------------
// createWarehouse
// ---------------------------------------------------------------------------

export async function createWarehouse(
  data: CreateWarehouseInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("warehouse:create");

    const parsed = createWarehouseSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.warehouse.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    });
    if (existing) {
      return { error: `A warehouse named "${parsed.data.name}" already exists` };
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        description: parsed.data.description || null,
      },
      include: { _count: { select: { locations: true } } },
    });

    return { data: warehouse };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to create warehouse",
    };
  }
}

// ---------------------------------------------------------------------------
// updateWarehouse
// ---------------------------------------------------------------------------

export async function updateWarehouse(
  id: string,
  data: UpdateWarehouseInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("warehouse:update");

    const parsed = updateWarehouseSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) return { error: "Warehouse not found" };

    // Check for name uniqueness if changed
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const dup = await prisma.warehouse.findFirst({
        where: { name: { equals: parsed.data.name, mode: "insensitive" }, id: { not: id } },
      });
      if (dup) return { error: `A warehouse named "${parsed.data.name}" already exists` };
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        name: parsed.data.name ?? existing.name,
        address: parsed.data.address !== undefined ? parsed.data.address : existing.address,
        description: parsed.data.description !== undefined ? parsed.data.description : existing.description,
      },
      include: { _count: { select: { locations: true } } },
    });

    return { data: warehouse };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to update warehouse",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteWarehouse
// ---------------------------------------------------------------------------

export async function deleteWarehouse(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("warehouse:delete");

    const existing = await prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { locations: true } } },
    });
    if (!existing) return { error: "Warehouse not found" };

    if (existing._count.locations > 0) {
      return {
        error: `Cannot delete warehouse: ${existing._count.locations} location(s) are assigned to it`,
      };
    }

    await prisma.warehouse.delete({ where: { id } });
    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to delete warehouse",
    };
  }
}
