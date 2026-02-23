/**
 * Auto-generate changelog entry from git commits on each deploy.
 *
 * Runs during `npm run build` (before `next build`).
 * - Reads the last changelog entry's buildId from the database
 * - Gets git commits since that build (or all commits if none exists)
 * - Inserts a new ChangelogEntry with the commit list
 * - Skips if no new commits since last entry
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

async function main() {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? run("git rev-parse --short HEAD");

  if (!buildId) {
    console.log("[changelog] No build ID available, skipping.");
    return;
  }

  // Get the last changelog entry
  const lastEntry = await prisma.changelogEntry.findFirst({
    where: { buildId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { buildId: true },
  });

  let commits: string;

  if (lastEntry?.buildId) {
    // Check if the last build commit exists in the repo
    const commitExists = run(`git cat-file -t ${lastEntry.buildId} 2>/dev/null`);

    if (commitExists) {
      commits = run(`git log ${lastEntry.buildId}..HEAD --oneline --no-decorate`);
    } else {
      // Last build hash not found in repo — get recent commits
      commits = run("git log --oneline --no-decorate -20");
    }
  } else {
    // No previous changelog — get all commits
    commits = run("git log --oneline --no-decorate");
  }

  if (!commits) {
    console.log("[changelog] No new commits since last changelog entry, skipping.");
    return;
  }

  const commitLines = commits.split("\n").filter(Boolean);

  // Format as markdown bullet list
  const changes = commitLines
    .map((line) => {
      // Remove the short hash prefix from each line
      const withoutHash = line.replace(/^[a-f0-9]+ /, "");
      return `- ${withoutHash}`;
    })
    .join("\n");

  // Generate a date-based version
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // 2026-02-23

  // Check if an entry with this buildId already exists
  const existing = await prisma.changelogEntry.findFirst({
    where: { buildId },
  });

  if (existing) {
    console.log(`[changelog] Entry for build ${buildId} already exists, skipping.`);
    return;
  }

  const title = lastEntry
    ? `Build ${buildId}`
    : `Initial Release`;

  await prisma.changelogEntry.create({
    data: {
      version: dateStr,
      title,
      changes,
      buildId,
    },
  });

  console.log(
    `[changelog] Created entry: "${title}" (${dateStr}) with ${commitLines.length} commit(s).`
  );
}

main()
  .catch((e) => {
    // Don't fail the build if changelog generation fails
    console.error("[changelog] Error generating changelog:", e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
