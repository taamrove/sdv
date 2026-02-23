"use client";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useVersionToggle } from "@/hooks/use-version-toggle";

interface VersionToggleProps {
  flagKey: string;
  hasAccess: boolean;
}

export function VersionToggle({ flagKey, hasAccess }: VersionToggleProps) {
  const { isDevVersion, toggle } = useVersionToggle(flagKey, hasAccess);

  if (!hasAccess) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Production</span>
      <Switch checked={isDevVersion} onCheckedChange={toggle} />
      <span className="text-xs text-muted-foreground">Dev</span>
      {isDevVersion && (
        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400">
          DEV
        </Badge>
      )}
    </div>
  );
}
