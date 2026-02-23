import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Temporary health check endpoint to verify Vercel → Neon DB connectivity.
 * DELETE THIS after debugging is done.
 *
 * Visit: https://sdv-six.vercel.app/api/health
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasAuthUrl: !!process.env.AUTH_URL,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  try {
    // Test basic connectivity
    const result = await prisma.$queryRaw<
      { now: Date }[]
    >`SELECT now() as now`;
    checks.dbConnected = true;
    checks.dbTime = result[0]?.now;

    // Check if admin user exists
    const userCount = await prisma.user.count();
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@sdv.com" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        role: { select: { name: true } },
      },
    });

    checks.userCount = userCount;
    checks.adminUser = adminUser
      ? { found: true, active: adminUser.active, role: adminUser.role.name }
      : { found: false };
  } catch (err) {
    checks.dbConnected = false;
    checks.dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(checks);
}
