import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

// Cache on globalThis in all environments (prevents connection leaks on serverless)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
