import { prisma } from "./prisma";
import { auth } from "./auth";

const ADMIN_ROLES = ["Admin", "Developer"];

function isAdminRole(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

interface CachedFlag {
  flag: {
    id: string;
    key: string;
    stage: "DEVELOPMENT" | "ALPHA" | "BETA" | "PRODUCTION";
    betaUserIds: string[];
  };
  expiresAt: number;
}

const flagCache = new Map<string, CachedFlag>();
const CACHE_TTL = 60_000;

async function getFlagFromCache(key: string) {
  const cached = flagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.flag;

  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      stage: true,
      betaUsers: { select: { userId: true } },
    },
  });

  if (flag) {
    const normalized = {
      ...flag,
      betaUserIds: flag.betaUsers.map((bu) => bu.userId),
    };
    flagCache.set(key, { flag: normalized, expiresAt: Date.now() + CACHE_TTL });
    return normalized;
  }

  return null;
}

export function invalidateFlagCache(key?: string) {
  if (key) flagCache.delete(key);
  else flagCache.clear();
}

export async function checkFeatureFlag(key: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const flag = await getFlagFromCache(key);
  if (!flag) return true; // No flag = not gated = allow

  switch (flag.stage) {
    case "PRODUCTION":
      return true;
    case "ALPHA":
      return isAdminRole(session.user.role);
    case "BETA":
      if (isAdminRole(session.user.role)) return true;
      return flag.betaUserIds.includes(session.user.id);
    case "DEVELOPMENT":
      return session.user.role === "Developer";
    default:
      return false;
  }
}

export async function requireFeatureFlag(key: string): Promise<void> {
  if (!(await checkFeatureFlag(key))) {
    throw new Error("Forbidden: feature not available");
  }
}

export async function getAccessibleFlagKeys(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];

  const allFlags = await prisma.featureFlag.findMany({
    select: {
      key: true,
      stage: true,
      betaUsers: { select: { userId: true } },
    },
  });

  return allFlags
    .filter((flag) => {
      switch (flag.stage) {
        case "PRODUCTION":
          return true;
        case "ALPHA":
          return isAdminRole(session.user.role);
        case "BETA":
          return (
            isAdminRole(session.user.role) ||
            flag.betaUsers.some((bu) => bu.userId === session.user.id)
          );
        case "DEVELOPMENT":
          return session.user.role === "Developer";
        default:
          return false;
      }
    })
    .map((flag) => flag.key);
}
