"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  BarChart3,
  Theater,
  Users,
  Palette,
  Warehouse,
  Container,
  Wrench,
  ScanLine,
  Shield,
  UserCog,
  Timer,
  Flag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FlagStage } from "@/lib/feature-flags";

// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see this link. Omit for always-visible. */
  permission?: string;
  /** Feature flag key required to see this link. Omit for always-visible. */
  featureFlag?: string;
  /** If true the link renders but is visually disabled (future feature). */
  disabled?: boolean;
  /** If true only the Developer role can see this item. */
  developerOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        label: "Pieces",
        href: "/inventory",
        icon: Package,
        permission: "pieces:read",
        featureFlag: "pieces",
      },
      {
        label: "Categories",
        href: "/inventory/categories",
        icon: FolderTree,
        permission: "category:read",
        featureFlag: "categories",
      },
      {
        label: "Items",
        href: "/inventory/products",
        icon: ShoppingBag,
        permission: "items:read",
        featureFlag: "items",
      },
      {
        label: "Availability",
        href: "/inventory/availability",
        icon: BarChart3,
        permission: "pieces:read",
        featureFlag: "availability",
      },
    ],
  },
  {
    title: "Shows",
    items: [
      {
        label: "Projects",
        href: "/projects",
        icon: Theater,
        permission: "projects:read",
        featureFlag: "projects",
      },
      {
        label: "Performers",
        href: "/performers",
        icon: Users,
        permission: "performers:read",
        featureFlag: "performers",
      },
      {
        label: "Themes",
        href: "/themes",
        icon: Palette,
        permission: "products:read",
        featureFlag: "themes",
      },
    ],
  },
  {
    title: "Warehouse",
    items: [
      {
        label: "Locations",
        href: "/warehouse",
        icon: Warehouse,
        permission: "location:read",
        featureFlag: "warehouse",
      },
      {
        label: "Containers",
        href: "/containers",
        icon: Container,
        permission: "container:read",
        featureFlag: "containers",
      },
    ],
  },
  {
    title: "",
    items: [
      {
        label: "Maintenance",
        href: "/maintenance",
        icon: Wrench,
        permission: "maintenance:read",
        featureFlag: "maintenance",
      },
      {
        label: "Scanner",
        href: "/scan",
        icon: ScanLine,
        featureFlag: "scanner",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: UserCog,
        permission: "user:read",
        featureFlag: "user-management",
      },
      {
        label: "Roles",
        href: "/admin/roles",
        icon: Shield,
        permission: "role:read",
        featureFlag: "role-management",
      },
      {
        label: "Quarantine Config",
        href: "/admin/quarantine-defaults",
        icon: Timer,
        permission: "role:read",
        featureFlag: "quarantine-config",
      },
      {
        label: "Feature Flags",
        href: "/admin/feature-flags",
        icon: Flag,
        permission: "admin:read",
        developerOnly: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Stage badge config
// ---------------------------------------------------------------------------

const STAGE_BADGE: Record<
  FlagStage,
  { label: string; className: string } | null
> = {
  PRODUCTION: null, // No badge for production
  BETA: {
    label: "BETA",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  ALPHA: {
    label: "ALPHA",
    className: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  },
  DEVELOPMENT: {
    label: "DEV",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { hasPermission, user } = usePermissions();
  const { hasFeatureAccess, getFlagStage } = useFeatureFlags();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /** Filter items the user cannot access. */
  function filterItems(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      if (item.permission && !hasPermission(item.permission)) return false;
      if (item.featureFlag && !hasFeatureAccess(item.featureFlag)) return false;
      if (item.developerOnly && user?.role !== "Developer") return false;
      return true;
    });
  }

  return (
    <nav className="flex flex-col gap-2 px-2 py-2">
      {navigation.map((group, groupIdx) => {
        const visibleItems = filterItems(group.items);
        if (visibleItems.length === 0) return null;

        return (
          <div key={groupIdx} className="flex flex-col gap-1">
            {group.title && !collapsed && (
              <span className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </span>
            )}
            {group.title && collapsed && (
              <div className="mx-auto my-1 h-px w-4 bg-border" />
            )}
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const stage = item.featureFlag
                ? getFlagStage(item.featureFlag)
                : null;
              const badge = stage ? STAGE_BADGE[stage] : null;

              const linkContent = (
                <Link
                  href={item.disabled ? "#" : item.href}
                  onClick={item.disabled ? undefined : onNavigate}
                  aria-disabled={item.disabled}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    item.disabled &&
                      "pointer-events-none opacity-40",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {badge && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      <span className="flex items-center gap-2">
                        {item.label}
                        {badge && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        )}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={item.href}>{linkContent}</div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
