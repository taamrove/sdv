"use client";

import { createContext, useContext } from "react";

interface FeatureFlagContextValue {
  flags: string[];
  hasFeatureAccess: (key: string) => boolean;
  loading: boolean;
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: [],
  hasFeatureAccess: () => true,
  loading: true,
});

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
