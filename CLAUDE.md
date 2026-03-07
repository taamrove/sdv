# SDV Lager — Claude Context

Costume & equipment inventory system for Show De Vida (SDV), a Norwegian
performing-arts company. Tracks items, warehouses, projects, and performers.

---

## Git Workflow

**Never commit directly to `main`.** Always branch, then PR/merge.

```bash
# Start any new piece of work:
git checkout main && git pull
git checkout -b <type>/<short-description>
# e.g. feat/contact-detail-page  fix/performer-search  chore/update-deps

# When done:
git push -u origin <branch>
gh pr create   # or merge manually after review
```

Branch naming: `feat/`, `fix/`, `chore/`, `refactor/`
`main` must always build and deploy cleanly.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Prisma (multi-schema: `auth` + `public`) |
| Auth | Auth.js v5 (credentials + JWT session) |
| UI | shadcn/ui + Tailwind CSS |
| Forms | react-hook-form + zod |
| Tables | TanStack Table v8 |
| Toasts | sonner |
| Icons | lucide-react |

---

## Project Structure

```
src/
  app/
    (auth)/          # Login page (no layout chrome)
    (dashboard)/     # All protected pages — share sidebar layout
      admin/         # Categories, Users, Roles, Feature Flags, Quarantine
      contacts/      # Contact Hub list (all people)
      containers/
      dashboard/
      inventory/     # Products + Items (nested: /[id]/items/[itemId])
      maintenance/
      performers/    # Performer list + detail/edit
      profile/
      projects/      # Project list + detail (assignments, bookings)
      scan/
      themes/
      warehouse/
    api/auth/        # Auth.js route handler

  actions/           # "use server" — one file per domain
    contacts.ts      # getContacts, getContactById
    performers.ts    # CRUD + soft-delete
    projects.ts      # getProjectById, assignPerformer, etc.
    …

  components/
    contacts/        # contact-list.tsx
    inventory/       # item-form, item-detail, product-detail, …
    layout/          # sidebar.tsx, sidebar-nav.tsx, mobile-bottom-nav.tsx
    performers/      # performer-form.tsx, performer-list.tsx
    projects/        # project-detail, add-performer-dialog, …
    shared/          # page-header, data-table, pagination, …
    ui/              # shadcn primitives (button, badge, input, …)

  hooks/             # use-permissions, use-feature-flags, …
  lib/
    auth.ts          # NextAuth config (authorize, JWT callbacks)
    auth.config.ts   # Shared auth config (callbacks, pages)
    constants.ts     # PERFORMER_TYPE_LABELS, SIZE labels, …
    feature-flags.ts # DB-backed flag checks with 60 s cache
    format-name.ts   # getFullName({ firstName, lastName })
    permissions.ts   # RESOURCES, ACTIONS, DEFAULT_ROLES
    prisma.ts        # Singleton PrismaClient (Neon adapter on Vercel)
    rbac.ts          # requirePermission() — throws Forbidden
    utils.ts         # cn() and misc helpers
    validators/      # zod schemas (performer.ts, …)

prisma/
  schema.prisma      # Two schemas: auth + public (see below)
  migrations/        # SQL history (db push + resolve on Neon)
  seed.ts            # Admin user + roles + default flags

scripts/
  import-performers.ts  # One-off CSV→DB importer
  generate-changelog.ts # Builds changelog from git log (runs in CI build)
```

---

## Database Schema (key models)

```
auth schema:
  User          — id, email, passwordHash, roleId, contactId (plain col, no FK)
  Role          — id, name, isSystem
  Permission    — id, resource, action
  RolePermission
  FeatureFlag   — id, key, stage (DEVELOPMENT|ALPHA|BETA|PRODUCTION)
  FeatureFlagBetaUser

public schema:
  Contact       — id, firstName, lastName, email?, phone?, notes?
  Performer     — id, contactId (→Contact), type, sizes (JSON), active, …
  PerformerAssignment — performerId, projectId, role, …
  Project       — id, name, status, startDate, endDate, …
  Item          — id, productId, status, condition, mainPerformerId?, …
  Product       — id, name, categoryId, …
  Category
  Location / Container
  MaintenanceTicket / MaintenanceComment / MaintenancePhoto
  Address / ContactAddress / Company / CompanyAddress / ContactCompany
```

### Contact Hub architecture
`Contact` is the single source of truth for personal data. `Performer` and
`User` are *role profiles* linked via `contactId`.

- `Performer.contactId` → `Contact.id` — full Prisma relation, works fine
- `User.contactId` is a **plain column** only (no `@relation`).
  A cross-schema Prisma relation `auth.User → public.Contact` causes a P1014
  error in the Next.js/Turbopack query engine. Use a raw lookup when needed:
  ```ts
  const contact = await prisma.contact.findUnique({ where: { id: user.contactId } });
  ```

---

## Auth & Permissions

- Login: email + bcrypt password → JWT session
- Session contains: `id, email, firstName, lastName, role, permissions[]`
- Admin/Developer role gets `permissions: ["*"]` (wildcard)
- All others get explicit `resource:action` strings
- Server-side gate: `await requirePermission("performers:read")` (throws Forbidden)
- Client-side gate: `usePermissions()` hook → `hasPermission(string)`
- Feature flags: DB rows; missing flag = open access; Admin/Developer bypass all flags

---

## Environment

```
.env          — Neon DATABASE_URL + DIRECT_URL (production/CI)
.env.local    — overrides for local dev (DATABASE_URL → Neon pooled,
                AUTH_URL + NEXT_PUBLIC_APP_URL → localhost:3000)
```

`prisma migrate dev` requires a shadow DB — **not supported on Neon**.
Use instead:
```bash
npx prisma db push --accept-data-loss   # apply schema changes
npx prisma migrate resolve --applied <migration_name>  # record in history
```

---

## Conventions

- **Server actions** live in `src/actions/`. Return `{ data } | { error: string }`.
  Paginated variants return `{ data[], pagination } | { error }`.
- **Pages** query Prisma directly (not through actions) for SSR.
- **Actions** are for client-triggered mutations.
- **Flattening pattern**: pages that need performer names for non-editable display
  flatten `performer.contact.firstName` at the server boundary before passing
  serialized props to client components.
- **Soft delete**: `Performer.active = false` (never hard-delete performers).
- **Feature flags** gate nav items; nav items also check `permission`.
- `getFullName({ firstName, lastName })` — always use this helper, never interpolate directly.

---

## Dev Servers (.claude/launch.json)

| Name | Command | Port |
|---|---|---|
| sdv-lager | `npm run dev` | 3000 |
| Prisma Studio | `npm run db:studio` | 5555 |
