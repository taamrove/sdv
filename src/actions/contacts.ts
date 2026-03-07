"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ContactListParams {
  search?: string;
  role?: string; // "performer" | "all"
  page?: number;
  limit?: number;
}

type ActionResult<T> = { data: T } | { error: string };
type PaginatedResult<T> =
  | { data: T[]; pagination: Pagination }
  | { error: string };

// ---------------------------------------------------------------------------
// getContacts
// ---------------------------------------------------------------------------

export async function getContacts(
  params?: ContactListParams
): Promise<PaginatedResult<unknown>> {
  try {
    await requirePermission("performers:read");

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {};

    if (params?.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params?.role === "performer") {
      where.performer = { isNot: null };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          performer: {
            select: { id: true, type: true, active: true },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to fetch contacts",
    };
  }
}

// ---------------------------------------------------------------------------
// getContactById
// ---------------------------------------------------------------------------

export async function getContactById(
  id: string
): Promise<ActionResult<unknown>> {
  try {
    await requirePermission("performers:read");

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        performer: {
          select: { id: true, type: true, active: true },
        },
      },
    });

    if (!contact) {
      return { error: "Contact not found" };
    }

    return { data: contact };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to fetch contact",
    };
  }
}
