"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  createWarehouseLocationSchema,
  updateWarehouseLocationSchema,
  buildLocationLabel,
  type CreateWarehouseLocationInput,
  type UpdateWarehouseLocationInput,
} from "@/lib/validators/warehouse";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WarehouseListParams {
  search?: string;
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getWarehouseLocations
// ---------------------------------------------------------------------------

export async function getWarehouseLocations(
  params?: WarehouseListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("warehouse:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (params?.search) {
      where.OR = [
        { label: { contains: params.search, mode: "insensitive" } },
        { zone: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [locations, total] = await Promise.all([
      prisma.warehouseLocation.findMany({
        where,
        include: {
          _count: { select: { items: true } },
          warehouse: true,
        },
        orderBy: { label: "asc" },
        skip,
        take: limit,
      }),
      prisma.warehouseLocation.count({ where }),
    ]);

    return {
      data: locations,
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
    return {
      error: error instanceof Error ? error.message : "Failed to fetch warehouse locations",
    };
  }
}

// ---------------------------------------------------------------------------
// getWarehouseLocationById
// ---------------------------------------------------------------------------

export async function getWarehouseLocationById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("warehouse:read");

    const location = await prisma.warehouseLocation.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
        warehouse: true,
      },
    });

    if (!location) {
      return { error: "Warehouse location not found" };
    }

    return { data: location };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to fetch warehouse location",
    };
  }
}

// ---------------------------------------------------------------------------
// createWarehouseLocation
// ---------------------------------------------------------------------------

export async function createWarehouseLocation(
  data: CreateWarehouseLocationInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("warehouse:create");

    const parsed = createWarehouseLocationSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const label = buildLocationLabel(parsed.data);

    const existing = await prisma.warehouseLocation.findFirst({
      where: { label },
    });

    if (existing) {
      return { error: `A location with label "${label}" already exists` };
    }

    const location = await prisma.warehouseLocation.create({
      data: {
        ...parsed.data,
        label,
      },
      include: {
        _count: { select: { items: true } },
        warehouse: true,
      },
    });

    return { data: location };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to create warehouse location",
    };
  }
}

// ---------------------------------------------------------------------------
// updateWarehouseLocation
// ---------------------------------------------------------------------------

export async function updateWarehouseLocation(
  id: string,
  data: UpdateWarehouseLocationInput
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("warehouse:update");

    const parsed = updateWarehouseLocationSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const existing = await prisma.warehouseLocation.findUnique({
      where: { id },
    });

    if (!existing) {
      return { error: "Warehouse location not found" };
    }

    // Rebuild label from merged data
    const merged = {
      zone: parsed.data.zone ?? existing.zone,
      rack: parsed.data.rack !== undefined ? parsed.data.rack : existing.rack,
      shelf:
        parsed.data.shelf !== undefined ? parsed.data.shelf : existing.shelf,
      bin: parsed.data.bin !== undefined ? parsed.data.bin : existing.bin,
    };

    const newLabel = buildLocationLabel(merged);

    // Check for label uniqueness if it changed
    if (newLabel !== existing.label) {
      const duplicate = await prisma.warehouseLocation.findFirst({
        where: { label: newLabel, id: { not: id } },
      });
      if (duplicate) {
        return {
          error: `A location with label "${newLabel}" already exists`,
        };
      }
    }

    const location = await prisma.warehouseLocation.update({
      where: { id },
      data: {
        ...parsed.data,
        label: newLabel,
      },
      include: {
        _count: { select: { items: true } },
        warehouse: true,
      },
    });

    return { data: location };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to update warehouse location",
    };
  }
}

// ---------------------------------------------------------------------------
// deleteWarehouseLocation
// ---------------------------------------------------------------------------

export async function deleteWarehouseLocation(
  id: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await requirePermission("warehouse:delete");

    const existing = await prisma.warehouseLocation.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!existing) {
      return { error: "Warehouse location not found" };
    }

    if (existing._count.items > 0) {
      return {
        error: `Cannot delete location: ${existing._count.items} item(s) are stored here`,
      };
    }

    await prisma.warehouseLocation.delete({ where: { id } });

    return { data: { success: true } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to delete warehouse location",
    };
  }
}
