"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  FeatureFlagContext,
  type ClientFlag,
} from "@/hooks/use-feature-flags";
import { getMyFeatureFlags } from "@/actions/feature-flags";
import type { FlagStage } from "@/lib/feature-flags";

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<ClientFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await getMyFeatureFlags();
    if ("data" in result) setFlags(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const hasFeatureAccess = useCallback(
    (key: string) => flags.some((f) => f.key === key),
    [flags]
  );

  const getFlagStage = useCallback(
    (key: string): FlagStage | null => {
      const flag = flags.find((f) => f.key === key);
      return flag?.stage ?? null;
    },
    [flags]
  );

  return (
    <FeatureFlagContext.Provider
      value={{ flags, hasFeatureAccess, getFlagStage, loading }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}
