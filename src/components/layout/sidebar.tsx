"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav } from "@/components/layout/sidebar-nav";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

// ---------------------------------------------------------------------------
// Desktop Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              SDV Lager
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-sidebar-foreground"
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav collapsed={collapsed} />
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <Separator />
          <div
            className={cn(
              "flex items-center px-4 py-3 text-xs text-muted-foreground",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            {collapsed ? (
              <span title={`Build: ${BUILD_ID}`}>v0.1</span>
            ) : (
              <>
                <span>SDV Lager v0.1</span>
                <span className="font-mono opacity-50" title={`Build: ${BUILD_ID}`}>
                  {BUILD_ID.startsWith("dev-") ? "local" : BUILD_ID}
                </span>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Mobile Sidebar Content (rendered inside a Sheet)
// ---------------------------------------------------------------------------

interface MobileSidebarContentProps {
  onNavigate: () => void;
}

export function MobileSidebarContent({
  onNavigate,
}: MobileSidebarContentProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={onNavigate} />
        </div>
        <div className="mt-auto">
          <Separator />
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
            <span>SDV Lager v0.1</span>
            <span className="font-mono opacity-50">
              {BUILD_ID.startsWith("dev-") ? "local" : BUILD_ID}
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
