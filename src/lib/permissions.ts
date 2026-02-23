export const RESOURCES = {
  PIECES: "pieces",
  CATEGORIES: "categories",
  ITEMS: "items",
  PRODUCTS: "products",
  BOOKINGS: "bookings",
  PROJECTS: "projects",
  PERFORMERS: "performers",
  CONTAINERS: "containers",
  WAREHOUSE: "warehouse",
  MAINTENANCE: "maintenance",
  SCAN: "scan",
  ADMIN: "admin",
  USERS: "users",
  ROLES: "roles",
  REPORTS: "reports",
  FEEDBACK: "feedback",
} as const;

export const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  ASSIGN: "assign",
  SCAN: "scan",
  PRINT: "print",
  IMPORT: "import",
  EXPORT: "export",
} as const;

export type PermissionString = `${string}:${string}`;

export const ALL_PERMISSIONS: PermissionString[] = [];

// Generate all resource:action combinations
for (const resource of Object.values(RESOURCES)) {
  for (const action of Object.values(ACTIONS)) {
    ALL_PERMISSIONS.push(`${resource}:${action}`);
  }
}

export interface RoleDefinition {
  name: string;
  description: string;
  isSystem: boolean;
  isDefault?: boolean;
  permissions: PermissionString[] | "*";
}

export const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  ADMIN: {
    name: "Admin",
    description: "Full system access",
    isSystem: true,
    permissions: "*",
  },
  MANAGER: {
    name: "Manager",
    description: "Full access except user and role management",
    isSystem: true,
    permissions: ALL_PERMISSIONS.filter(
      (p) => !p.startsWith("users:") && !p.startsWith("roles:")
    ),
  },
  DEVELOPER: {
    name: "Developer",
    description: "Full admin access with developer capabilities",
    isSystem: true,
    permissions: "*",
  },
  WAREHOUSE: {
    name: "Warehouse",
    description: "Inventory management, packing, check-in/check-out",
    isSystem: true,
    permissions: [
      "pieces:create",
      "pieces:read",
      "pieces:update",
      "pieces:delete",
      "pieces:import",
      "pieces:export",
      "categories:read",
      "items:create",
      "items:read",
      "items:update",
      "items:delete",
      "products:read",
      "bookings:create",
      "bookings:read",
      "bookings:update",
      "bookings:assign",
      "projects:read",
      "performers:read",
      "containers:create",
      "containers:read",
      "containers:update",
      "containers:delete",
      "containers:print",
      "warehouse:create",
      "warehouse:read",
      "warehouse:update",
      "warehouse:delete",
      "scan:scan",
      "maintenance:create",
      "maintenance:read",
      "reports:read",
      "feedback:create",
    ],
  },
  MAINTENANCE: {
    name: "Maintenance",
    description: "View and manage assigned repairs",
    isSystem: true,
    permissions: [
      "pieces:read",
      "categories:read",
      "items:read",
      "maintenance:read",
      "maintenance:update",
      "scan:scan",
      "feedback:create",
    ],
  },
  VIEWER: {
    name: "Viewer",
    description: "Read-only access for performers and management",
    isSystem: true,
    isDefault: true,
    permissions: [
      "pieces:read",
      "categories:read",
      "items:read",
      "products:read",
      "bookings:read",
      "projects:read",
      "performers:read",
      "containers:read",
      "warehouse:read",
      "maintenance:read",
      "reports:read",
      "feedback:create",
    ],
  },
};
