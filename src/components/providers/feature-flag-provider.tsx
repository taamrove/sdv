"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { FeatureFlagContext } from "@/hooks/use-feature-flags";
import { getMyFeatureFlags } from "@/actions/feature-flags";

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<string[]>([]);
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
    (key: string) => flags.includes(key),
    [flags]
  );

  return (
    <FeatureFlagContext.Provider value={{ flags, hasFeatureAccess, loading }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
