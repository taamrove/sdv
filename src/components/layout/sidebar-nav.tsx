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
      },
      {
        label: "Categories",
        href: "/inventory/categories",
        icon: FolderTree,
        permission: "category:read",
      },
      {
        label: "Items",
        href: "/inventory/products",
        icon: ShoppingBag,
        permission: "items:read",
      },
      {
        label: "Availability",
        href: "/inventory/availability",
        icon: BarChart3,
        permission: "pieces:read",
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
      },
      {
        label: "Performers",
        href: "/performers",
        icon: Users,
        permission: "performers:read",
      },
      {
        label: "Themes",
        href: "/themes",
        icon: Palette,
        permission: "products:read",
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
      },
      {
        label: "Containers",
        href: "/containers",
        icon: Container,
        permission: "container:read",
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
      },
      {
        label: "Scanner",
        href: "/scan",
        icon: ScanLine,
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
      },
      {
        label: "Roles",
        href: "/admin/roles",
        icon: Shield,
        permission: "role:read",
      },
      {
        label: "Quarantine Config",
        href: "/admin/quarantine-defaults",
        icon: Timer,
        permission: "role:read",
      },
      {
        label: "Feature Flags",
        href: "/admin/feature-flags",
        icon: Flag,
        permission: "admin:read",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { hasFeatureAccess } = useFeatureFlags();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /** Filter items the user cannot access. */
  function filterItems(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      if (item.permission && !hasPermission(item.permission)) return false;
      if (item.featureFlag && !hasFeatureAccess(item.featureFlag)) return false;
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
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
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
