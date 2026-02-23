-- AlterEnum (must be committed before it can be used as a default)
ALTER TYPE "FeatureFlagStage" ADD VALUE IF NOT EXISTS 'DEVELOPMENT' BEFORE 'ALPHA';
