"use client";

import { useVersionCheck } from "@/hooks/use-version-check";

/**
 * Invisible component that polls for new deployments and shows a toast
 * when a new version is available. Mount once in the dashboard layout.
 */
export function VersionChecker() {
  useVersionCheck();
  return null;
}
