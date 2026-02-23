"use client";

import { useState, useEffect, useCallback } from "react";

function getStorageKey(flagKey: string) {
  return `version-toggle:${flagKey}`;
}

interface UseVersionToggleReturn {
  isDevVersion: boolean;
  toggle: () => void;
  hasAccess: boolean;
}

export function useVersionToggle(
  flagKey: string,
  hasAccess: boolean
): UseVersionToggleReturn {
  const [isDevVersion, setIsDevVersion] = useState(false);

  // Read persisted preference from localStorage after mount (hydration-safe)
  useEffect(() => {
    if (!hasAccess) {
      setIsDevVersion(false);
      return;
    }

    try {
      const stored = localStorage.getItem(getStorageKey(flagKey));
      if (stored === "true") {
        setIsDevVersion(true);
      }
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.)
    }
  }, [flagKey, hasAccess]);

  const toggle = useCallback(() => {
    if (!hasAccess) return;

    setIsDevVersion((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(getStorageKey(flagKey), String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, [flagKey, hasAccess]);

  return {
    isDevVersion: hasAccess ? isDevVersion : false,
    toggle,
    hasAccess,
  };
}
