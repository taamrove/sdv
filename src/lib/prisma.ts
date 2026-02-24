import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache on globalThis in all environments (prevents connection leaks on serverless)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
