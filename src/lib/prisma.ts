import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  LOGGABLE_MODELS,
  computeDiff,
  resolveEntityLabel,
  logActivity,
} from "@/lib/activity-logger";
import { getFullName } from "@/lib/format-name";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaClient = any;

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildExtendedClient> | undefined;
};

function createBaseClient(): PrismaClient {
  const isServerless = process.env.VERCEL === "1";

  if (isServerless) {
    // On Vercel: use Neon HTTP driver (no TCP cold-start penalty)
    const adapter = new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
    });
    return new PrismaClient({ adapter, log: ["error"] });
  }

  // Local dev: standard TCP connection (faster for persistent processes)
  return new PrismaClient({
    log: ["warn", "error"],
    datasourceUrl: process.env.DATABASE_URL,
  });
}

function buildExtendedClient() {
  const base = createBaseClient();

  return base.$extends({
    query: {
      $allOperations: async ({
        model,
        operation,
        args,
        query,
      }: {
        model?: string | undefined;
        operation: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: (args: any) => Promise<any>;
      }) => {
        if (!model || !LOGGABLE_MODELS.has(model)) return query(args);
        if (!["create", "update", "delete", "upsert"].includes(operation))
          return query(args);

        let userId: string | null = null;
        let userName: string | null = null;
        try {
          // Dynamic import to avoid circular deps and seed context issues
          const { auth } = await import("@/lib/auth");
          const session = await auth();
          if (session?.user) {
            userId = session.user.id ?? null;
            const u = session.user as { firstName?: string; lastName?: string };
            userName = u.firstName ? getFullName(u) : null;
          }
        } catch {
          /* seed/test — no request context */
        }

        const lcModel = (
          model.charAt(0).toLowerCase() + model.slice(1)
        ) as keyof typeof base;

        if (operation === "create") {
          const result = (await query(args)) as Record<string, unknown>;
          const label = await resolveEntityLabel(base as AnyPrismaClient, model, result);
          await logActivity({
            prisma: base as AnyPrismaClient,
            model,
            entityId: result.id as string,
            action: "CREATED",
            userId,
            userName,
            entityLabel: label,
          });
          return result;
        }

        if (operation === "update") {
          const updateArgs = args as { where: unknown };
          const delegate = (base[lcModel] as unknown) as {
            findUnique: (a: { where: unknown }) => Promise<Record<string, unknown> | null>;
          };
          const prev = await delegate.findUnique({ where: updateArgs.where });
          const result = (await query(args)) as Record<string, unknown>;
          if (prev) {
            const changes = computeDiff(model, prev, result);
            const label = await resolveEntityLabel(base as AnyPrismaClient, model, result);
            await logActivity({
              prisma: base as AnyPrismaClient,
              model,
              entityId: result.id as string,
              action: "UPDATED",
              userId,
              userName,
              changes,
              entityLabel: label,
            });
          }
          return result;
        }

        if (operation === "delete") {
          const deleteArgs = args as { where: unknown };
          const delegate = (base[lcModel] as unknown) as {
            findUnique: (a: { where: unknown }) => Promise<Record<string, unknown> | null>;
          };
          const prev = await delegate.findUnique({ where: deleteArgs.where });
          const result = (await query(args)) as Record<string, unknown>;
          const label = prev
            ? await resolveEntityLabel(base as AnyPrismaClient, model, prev)
            : null;
          await logActivity({
            prisma: base as AnyPrismaClient,
            model,
            entityId: result.id as string,
            action: "DELETED",
            userId,
            userName,
            entityLabel: label,
          });
          return result;
        }

        // upsert
        const upsertArgs = args as { where: unknown };
        const upsertDelegate = (base[lcModel] as unknown) as {
          findUnique: (a: { where: unknown }) => Promise<Record<string, unknown> | null>;
        };
        const existing = await upsertDelegate.findUnique({ where: upsertArgs.where });
        const result = (await query(args)) as Record<string, unknown>;
        const label = await resolveEntityLabel(base as AnyPrismaClient, model, result);
        if (existing) {
          const changes = computeDiff(model, existing, result);
          await logActivity({
            prisma: base as AnyPrismaClient,
            model,
            entityId: result.id as string,
            action: "UPDATED",
            userId,
            userName,
            changes,
            entityLabel: label,
          });
        } else {
          await logActivity({
            prisma: base as AnyPrismaClient,
            model,
            entityId: result.id as string,
            action: "CREATED",
            userId,
            userName,
            entityLabel: label,
          });
        }
        return result;
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? buildExtendedClient();

// Cache on globalThis in all environments (prevents connection leaks on serverless)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
