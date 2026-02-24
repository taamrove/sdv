import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  type PermissionString,
} from "../src/lib/permissions";
import { DEFAULT_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create all permissions
  console.log("Creating permissions...");
  const permissionMap = new Map<string, string>();

  for (const perm of ALL_PERMISSIONS) {
    const [resource, action] = perm.split(":");
    const created = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action, description: `${action} ${resource}` },
    });
    permissionMap.set(perm, created.id);
  }
  console.log(`  Created ${permissionMap.size} permissions`);

  // 2. Create roles with permissions
  console.log("Creating roles...");
  const roleMap = new Map<string, string>();

  for (const [key, roleDef] of Object.entries(DEFAULT_ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isDefault: roleDef.isDefault ?? false,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isDefault: roleDef.isDefault ?? false,
      },
    });
    roleMap.set(key, role.id);

    // Assign permissions
    // First remove existing permissions for this role
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (roleDef.permissions === "*") {
      // Admin gets all permissions
      const allPermIds = Array.from(permissionMap.values());
      await prisma.rolePermission.createMany({
        data: allPermIds.map((permId) => ({
          roleId: role.id,
          permissionId: permId,
        })),
      });
    } else {
      const permIds = (roleDef.permissions as PermissionString[])
        .map((p) => permissionMap.get(p))
        .filter((id): id is string => id !== undefined);

      if (permIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permIds.map((permId) => ({
            roleId: role.id,
            permissionId: permId,
          })),
        });
      }
    }

    console.log(
      `  Role "${roleDef.name}" created with ${roleDef.permissions === "*" ? "all" : (roleDef.permissions as string[]).length} permissions`
    );
  }

  // 3. Create default admin user
  console.log("Creating admin user...");
  const adminRoleId = roleMap.get("ADMIN")!;
  const passwordHash = await bcrypt.hash("changeme", 12);

  await prisma.user.upsert({
    where: { email: "admin@sdv.com" },
    update: {},
    create: {
      email: "admin@sdv.com",
      firstName: "Admin",
      lastName: "User",
      passwordHash,
      roleId: adminRoleId,
    },
  });
  console.log('  Admin user created (admin@sdv.com / changeme)');

  // 4. Create default feature flags (all existing features at PRODUCTION)
  console.log("Creating feature flags...");
  const defaultFlags = [
    { key: "items", name: "Items", description: "Physical item inventory management" },
    { key: "categories", name: "Categories", description: "Category management" },
    { key: "products", name: "Products", description: "Product template catalog" },
    { key: "packs", name: "Packs", description: "Pack grouping management" },
    { key: "kits", name: "Kits", description: "Kit/outfit management" },
    { key: "availability", name: "Availability", description: "Item availability view" },
    { key: "projects", name: "Projects", description: "Show/project management" },
    { key: "performers", name: "Performers", description: "Performer management" },
    { key: "themes", name: "Themes", description: "Theme management" },
    { key: "warehouse", name: "Warehouse", description: "Warehouse locations" },
    { key: "containers", name: "Containers", description: "Container management" },
    { key: "maintenance", name: "Maintenance", description: "Maintenance & repairs" },
    { key: "scanner", name: "Scanner", description: "QR/barcode scanning" },
    { key: "user-management", name: "User Management", description: "User administration" },
    { key: "role-management", name: "Role Management", description: "Role & permission administration" },
    { key: "quarantine-config", name: "Quarantine Config", description: "Quarantine default settings" },
  ];

  for (const flag of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { name: flag.name, description: flag.description },
      create: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        stage: "PRODUCTION",
      },
    });
  }
  console.log(`  Created ${defaultFlags.length} feature flags (all PRODUCTION)`);

  // 5. Create default categories
  console.log("Creating categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description },
      create: {
        code: cat.code,
        name: cat.name,
        description: cat.description,
      },
    });
  }
  console.log(`  Created ${DEFAULT_CATEGORIES.length} categories`);

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
