-- CreateEnum
CREATE TYPE "FeatureFlagStage" AS ENUM ('ALPHA', 'BETA', 'PRODUCTION');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stage" "FeatureFlagStage" NOT NULL DEFAULT 'ALPHA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_users" (
    "flagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "feature_flag_users_pkey" PRIMARY KEY ("flagId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- AddForeignKey
ALTER TABLE "feature_flag_users" ADD CONSTRAINT "feature_flag_users_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_users" ADD CONSTRAINT "feature_flag_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
