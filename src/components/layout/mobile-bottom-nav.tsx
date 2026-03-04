"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, Package, Warehouse, Theater } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Scan", icon: ScanLine, href: "/scan" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Warehouse", icon: Warehouse, href: "/warehouse" },
  { label: "Projects", icon: Theater, href: "/projects" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
