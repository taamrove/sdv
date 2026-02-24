"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import {
  FeatureFlagContext,
  type ClientFlag,
} from "@/hooks/use-feature-flags";
import { getMyFeatureFlags } from "@/actions/feature-flags";
import type { FlagStage } from "@/lib/feature-flags";

// Debounce window-focus refreshes to avoid hammering the DB
const FOCUS_DEBOUNCE_MS = 30_000;

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<ClientFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetched = useRef(0);

  const refresh = useCallback(async (force = false) => {
    // Debounce: don't re-fetch if we fetched recently
    const now = Date.now();
    if (!force && now - lastFetched.current < FOCUS_DEBOUNCE_MS) return;

    try {
      const result = await getMyFeatureFlags();
      if ("data" in result) {
        setFlags(result.data);
        lastFetched.current = Date.now();
      }
    } catch (err) {
      console.error("Failed to fetch feature flags:", err);
      // Don't crash — keep whatever flags we had
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(true);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const hasFeatureAccess = useCallback(
    (key: string) => {
      // While loading, assume access (optimistic) so nav items don't flash away
      if (loading) return true;
      return flags.some((f) => f.key === key);
    },
    [flags, loading]
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
