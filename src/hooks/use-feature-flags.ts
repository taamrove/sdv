"use client";

import { createContext, useContext } from "react";
import type { FlagStage } from "@/lib/feature-flags";

export interface ClientFlag {
  key: string;
  stage: FlagStage;
}

interface FeatureFlagContextValue {
  flags: ClientFlag[];
  hasFeatureAccess: (key: string) => boolean;
  getFlagStage: (key: string) => FlagStage | null;
  loading: boolean;
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: [],
  hasFeatureAccess: () => true,
  getFlagStage: () => null,
  loading: true,
});

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
