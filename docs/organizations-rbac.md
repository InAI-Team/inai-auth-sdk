# Organizations & RBAC

InAI Auth provides multi-tenant organization management with role-based access control (RBAC). This guide covers the organization model, roles and permissions, and how to enforce access control in your application.

## Organization Model

### Hierarchy

```
Tenant (your InAI account)
  Application (your product)
    Environment (dev / production)
      Users (end users of your product)
        Organization Memberships
          - Organization A (role: admin)
          - Organization B (role: member)
```

An organization represents a group of users within your application. Common examples include companies, teams, or workspaces. Each user can belong to multiple organizations and has a role within each.

### OrganizationResource

```ts
interface OrganizationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
```

### Active Organization

Each user has one "active organization" at a time. This determines which org-scoped permissions are included in their JWT. Switching the active organization re-issues the JWT with the new org claims.

JWT claims when an organization is active:

```json
{
  "sub": "user_abc123",
  "org_id": "org_xyz789",
  "org_slug": "acme-corp",
  "org_role": "admin",
  "org_permissions": ["members:read", "members:invite", "billing:manage"]
}
```

## Roles and Permissions

### Concepts

- **Role**: A named collection of permissions assigned to a user. Examples: `admin`, `member`, `viewer`.
- **Permission**: A specific action a user can perform. Examples: `users:read`, `content:write`, `billing:manage`.
- **Global roles/permissions**: Scoped to the application, not a specific organization. Stored in `roles` and `permissions` JWT claims.
- **Org roles/permissions**: Scoped to the active organization. Stored in `org_role` and `org_permissions` JWT claims.

### Checking Permissions

You can access the user's roles and permissions directly as arrays, or use the `has()` helper for single checks:

```ts
// Direct access to roles and permissions arrays
auth.roles         // e.g. ["admin", "editor"]
auth.permissions   // e.g. ["users:read", "content:write", "billing:manage"]

// has() helper checks both global and org-scoped claims
auth.has({ role: "admin" })          // true if "admin" is in the user's roles array
auth.has({ permission: "users:read" }) // true if "users:read" is in the user's permissions array
```

## Client-Side Access Control

### Protect Component

Renders children only when the user is signed in and has the required role or permission:

```tsx
import { Protect } from "@inai-dev/nextjs";

// Require authentication only
<Protect fallback={<p>Please sign in</p>}>
  <Dashboard />
</Protect>

// Require a specific role
<Protect role="admin" fallback={<p>Admin access required</p>}>
  <AdminPanel />
</Protect>

// Require a specific permission
<Protect permission="billing:manage" fallback={<p>Not authorized</p>}>
  <BillingSettings />
</Protect>
```

### PermissionGate Component

Similar to `Protect` but only checks the permission/role, without requiring the user to be signed in first. Use this when you need fine-grained control inside an already-authenticated section:

```tsx
import { PermissionGate } from "@inai-dev/nextjs";

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>

      <PermissionGate permission="users:write">
        <button>Create User</button>
      </PermissionGate>

      <PermissionGate role="admin" fallback={<p>Contact an admin to change this.</p>}>
        <DangerZone />
      </PermissionGate>
    </div>
  );
}
```

### useAuth() has() Function

For programmatic checks in client components:

```tsx
"use client";
import { useAuth } from "@inai-dev/nextjs";

function ActionBar() {
  const { has } = useAuth();

  return (
    <div>
      <button>View</button>
      {has({ permission: "content:write" }) && <button>Edit</button>}
      {has({ role: "admin" }) && <button>Delete</button>}
    </div>
  );
}
```

### SignedIn / SignedOut

For simple authentication-gated rendering:

```tsx
import { SignedIn, SignedOut } from "@inai-dev/nextjs";

function Header() {
  return (
    <header>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <a href="/login">Sign in</a>
      </SignedOut>
    </header>
  );
}
```

## Server-Side Access Control

### auth().protect()

In server components and server actions, use `protect()` to enforce authentication and authorization:

```tsx
// Require authentication
import { auth } from "@inai-dev/nextjs/server";

export default async function DashboardPage() {
  const { protect } = await auth();
  protect(); // Redirects to /login if not authenticated
  // ...
}
```

```tsx
// Require a role
export default async function AdminPage() {
  const { protect } = await auth();
  protect({ role: "admin" });
  // Redirects to /unauthorized if user lacks the "admin" role
  // ...
}
```

```tsx
// Require a permission with custom redirect
export default async function BillingPage() {
  const { protect } = await auth();
  protect({ permission: "billing:manage", redirectTo: "/upgrade" });
  // ...
}
```

### auth().has()

For conditional rendering in server components:

```tsx
import { auth } from "@inai-dev/nextjs/server";

export default async function Page() {
  const { userId, has } = await auth();

  if (!userId) redirect("/login");

  return (
    <div>
      <h1>Dashboard</h1>
      {has({ role: "admin" }) && <AdminStats />}
      {has({ permission: "reports:export" }) && <ExportButton />}
    </div>
  );
}
```

### Middleware afterAuth

For route-level access control:

```ts
// middleware.ts
import { inaiAuthMiddleware } from "@inai-dev/nextjs/middleware";
import { NextResponse } from "next/server";

export default inaiAuthMiddleware({
  publicRoutes: ["/", "/login"],
  afterAuth: (auth, req) => {
    const { pathname } = req.nextUrl;

    // Admin routes require admin role
    if (pathname.startsWith("/admin") && !auth.has({ role: "admin" })) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Billing routes require billing permission
    if (pathname.startsWith("/billing") && !auth.has({ permission: "billing:manage" })) {
      return NextResponse.redirect(new URL("/upgrade", req.url));
    }
  },
});
```

## Organization Switching

### OrganizationSwitcher Component

A drop-in component that lists the user's organizations and allows switching:

```tsx
import { OrganizationSwitcher } from "@inai-dev/nextjs";

function Sidebar() {
  return (
    <aside>
      <OrganizationSwitcher />
      <nav>{/* ... */}</nav>
    </aside>
  );
}
```

The component:
1. Fetches organizations from `GET /api/organizations`
2. Displays a dropdown with the current org highlighted
3. On selection, calls `POST /api/auth/set-active-organization`
4. Reloads the page to apply the new org context

### Manual Organization Switching

```tsx
"use client";

async function switchOrg(orgId: string) {
  await fetch("/api/auth/set-active-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: orgId }),
  });
  window.location.reload();
}
```

### Reading Organization Context

**Client side:**

```tsx
import { useSession, useOrganization } from "@inai-dev/nextjs";

function OrgInfo() {
  const { orgId, orgRole } = useOrganization();
  return <p>Org: {orgId}, Role: {orgRole}</p>;
}
```

**Server side:**

```tsx
import { auth } from "@inai-dev/nextjs/server";

export default async function Page() {
  const { orgId, orgRole } = await auth();
  // orgId and orgRole come from the JWT claims
}
```

## Permission Naming Conventions

InAI does not enforce a specific permission naming scheme, but we recommend the `resource:action` pattern:

| Permission | Description |
|-----------|-------------|
| `users:read` | View user list |
| `users:write` | Create/update users |
| `users:delete` | Delete users |
| `content:read` | View content |
| `content:write` | Create/edit content |
| `content:publish` | Publish content |
| `billing:manage` | Manage billing/subscriptions |
| `members:invite` | Invite organization members |
| `settings:manage` | Manage org/app settings |

These permissions are configured in the InAI Auth admin panel when defining roles.
