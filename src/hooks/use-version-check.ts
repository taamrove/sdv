"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 60_000; // Check every 60 seconds
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown";

export function useVersionCheck() {
  const hasNotified = useRef(false);

  const checkVersion = useCallback(async () => {
    if (hasNotified.current) return;

    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const serverBuildId = data.buildId;

      // Skip during local dev (build IDs change on every HMR)
      if (BUILD_ID.startsWith("dev-") || serverBuildId.startsWith("dev-")) {
        return;
      }

      if (serverBuildId && serverBuildId !== BUILD_ID) {
        hasNotified.current = true;
        toast("New version available", {
          description: "A new version of SDV Lager has been deployed.",
          duration: Infinity,
          action: {
            label: "Refresh",
            onClick: () => window.location.reload(),
          },
        });
      }
    } catch {
      // Silently ignore network errors
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay (let the app settle)
    const initialTimeout = setTimeout(checkVersion, 5_000);

    // Then poll regularly
    const interval = setInterval(checkVersion, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkVersion]);

  return BUILD_ID;
}
