-- CreateTable
CREATE TABLE IF NOT EXISTS "changelog_entries" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "buildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "changelog_entries_pkey" PRIMARY KEY ("id")
);
