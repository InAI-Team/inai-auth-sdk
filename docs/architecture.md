# Architecture

This document explains the internal architecture of the InAI Auth SDK, including the package structure, cookie strategy, JWT design, multi-tenant hierarchy, and security model.

## Package Dependency Graph

The SDK is split into separate packages following this dependency graph:

```
@inai-dev/types          (zero dependencies)
    |
@inai-dev/shared         (depends on @inai-dev/types)
    |
@inai-dev/backend        (depends on @inai-dev/shared)
    |
@inai-dev/react          (depends on @inai-dev/shared, peer: react)
    |
@inai-dev/nextjs         (depends on @inai-dev/backend, @inai-dev/react, peer: next)
    |
@inai-dev/astro          (depends on @inai-dev/backend, peer: astro)
```

### Internal Structure (packages/sdk-auth)

```
packages/sdk-auth/src/
  index.ts                   Core exports (InAIAuthClient, types)
  client.ts                  InAIAuthClient class + InAIAuthError
  types.ts                   All TypeScript interfaces

  nextjs/
    index.ts                 Client re-exports (hooks, components)
    client-entry.ts          "use client" barrel (built with banner)
    client.tsx               InAIAuthProvider, useAuth, useUser, useSession, useOrganization
    server.ts                auth(), currentUser(), re-exports createAuthRoutes
    middleware.ts             inaiAuthMiddleware, withInAIAuth, createRouteMatcher
    api-routes.ts            createAuthRoutes (app user auth)
    platform-api-routes.ts   createPlatformAuthRoutes (platform auth)
    cookies.ts               Cookie read/write utilities, JWT decoding
    config.ts                configureAuth, getAuthConfig

    hooks/
      use-sign-in.ts         useSignIn hook
      use-sign-up.ts         useSignUp hook

    components/
      sign-in.tsx            <SignIn> form component
      user-button.tsx        <UserButton> avatar dropdown
      signed-in.tsx          <SignedIn> conditional renderer
      signed-out.tsx         <SignedOut> conditional renderer
      protect.tsx            <Protect> role/permission gate
      permission-gate.tsx    <PermissionGate> permission check
      org-switcher.tsx       <OrganizationSwitcher> dropdown
```

### Build Configuration (tsup)

The SDK uses tsup with two build entries:

1. **Server entry** - `index.ts`, `nextjs/index.ts`, `nextjs/server.ts`, `nextjs/middleware.ts`. Standard ESM output.
2. **Client entry** - `nextjs/client-entry.ts`. Built with a `"use client"` banner so Next.js knows the entire bundle is client-side.

This split is necessary because Next.js requires an explicit `"use client"` directive at the top of modules that use React hooks or browser APIs. Server code must not include this directive.

```ts
// tsup.config.ts (simplified)
export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "nextjs/index": "src/nextjs/index.ts",
      "nextjs/server": "src/nextjs/server.ts",
      "nextjs/middleware": "src/nextjs/middleware.ts",
    },
    format: ["esm"],
    dts: true,
    external: ["react", "react-dom", "next", /\.\/client-entry/],
  },
  {
    entry: { "nextjs/client-entry": "src/nextjs/client-entry.ts" },
    format: ["esm"],
    dts: true,
    external: ["react", "react-dom", "next"],
    banner: { js: '"use client";' },
  },
]);
```

## 3-Cookie Strategy

InAI Auth uses three cookies to manage authentication state. This design balances security (httpOnly tokens), usability (client-readable session), and token isolation (refresh token path-scoped).

### auth_token

| Property | Value |
|----------|-------|
| Name | `auth_token` |
| Content | JWT access token |
| httpOnly | `true` |
| secure | `true` in production |
| sameSite | `lax` |
| path | `/` |
| maxAge | 7 days (cookie lifetime; JWT has its own shorter `exp`) |

The JWT access token is stored in an httpOnly cookie so it cannot be read by client-side JavaScript. This prevents XSS attacks from stealing tokens. The JWT's `exp` claim determines the actual validity period (typically 15-60 minutes); the cookie `maxAge` is longer to allow the middleware to attempt a refresh before clearing.

### refresh_token

| Property | Value |
|----------|-------|
| Name | `refresh_token` |
| Content | Opaque refresh token string |
| httpOnly | `true` |
| secure | `true` in production |
| sameSite | `strict` |
| path | `/api/auth` |
| maxAge | 7 days |

The refresh token is path-scoped to `/api/auth` so it is only sent on auth-related requests. This limits exposure -- the token is never sent to application API routes, third-party scripts, or image requests. The `sameSite: strict` setting provides additional CSRF protection.

### auth_session

| Property | Value |
|----------|-------|
| Name | `auth_session` |
| Content | JSON string with user profile, permissions, org context |
| httpOnly | `false` |
| secure | `true` in production |
| sameSite | `lax` |
| path | `/` |
| maxAge | 7 days |

The session cookie is intentionally NOT httpOnly so that the `InAIAuthProvider` can read it on the client side to hydrate React state without a network request. It contains:

```ts
interface SessionData {
  user: UserResource;
  expiresAt: string;
  permissions?: string[];
  orgId?: string;
  orgRole?: string;
  appId?: string;
  envId?: string;
}
```

This cookie is not a security credential. Even if tampered with, the actual auth decisions are made by the API using the httpOnly `auth_token`. The session cookie is a performance optimization for client-side rendering.

## JWT Claims Structure

The InAI Auth API issues JWTs with the following claims:

```ts
interface JWTClaims {
  sub: string;                      // User ID
  type: "app_user" | "platform";    // Distinguishes app users from platform users
  tenant_id: string;                // Tenant (account) ID
  env_id?: string;                  // Environment ID (app_user only)
  app_id?: string;                  // Application ID (app_user only)
  email: string;                    // User's email
  roles: string[];                  // Global roles (e.g., ["admin", "editor"])
  permissions: string[];            // Global permissions (e.g., ["users:read"])
  org_id?: string;                  // Active organization ID
  org_slug?: string;                // Active organization slug
  org_role?: string;                // Role within the active org
  org_permissions?: string[];       // Permissions scoped to the active org
  external_id?: string;             // External system reference
  iat: number;                      // Issued at (Unix timestamp)
  exp: number;                      // Expiration (Unix timestamp)
}
```

### Two Token Types

- **`app_user`**: Issued to end users of your application. Includes `app_id` and `env_id` to scope the user to a specific application environment.
- **`platform`**: Issued to developers/operators who manage applications via the admin panel. Does not include `app_id` or `env_id`.

### JWT Decoding (Not Verification)

The SDK decodes JWTs by base64-decoding the payload segment. It does NOT verify the JWT signature. This is intentional:

```ts
function decodeJWTPayload(token: string): JWTClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(payload));
}
```

See the Security Model section below for why this is safe.

## Multi-Tenant Hierarchy

```
SuperAdmin (isSuperAdmin flag, global admin operations)
  |
  Tenants (accounts with plan, maxApplications)
    |
    Applications (name, slug, domain, settings, authConfig)
      |
      Environments (dev / production, each with a publishableKey)
        |
        App Users (scoped to an environment)
        Roles (scoped to the application)
        Permissions (scoped to the application)
        Sessions (scoped to the environment)
        API Keys (scoped to the environment)
        Organizations (scoped to the tenant)
```

### Key Isolation Boundaries

1. **Tenant isolation**: Each tenant's data is completely separate. Users, applications, and organizations never leak across tenants.
2. **Application isolation**: Each application within a tenant has its own configuration, roles, and user scoping.
3. **Environment isolation**: Each environment (dev/production) has its own publishable key, users, sessions, and API keys. A user in the `development` environment cannot authenticate in the `production` environment.

### Publishable Key Role

The `X-Publishable-Key` header sent on `/api/v1/*` requests identifies which application and environment the request belongs to. The API uses this to:

1. Resolve the tenant, application, and environment
2. Apply the correct auth configuration (password policies, MFA requirements)
3. Scope all data operations to the correct environment

## Security Model

### The API is the Security Boundary

The SDK does not verify JWT signatures. This is a deliberate architectural decision:

1. **The JWT secret is never exposed to the client or the Next.js server**. Only the InAI Auth API (running on Cloudflare Workers) has access to `JWT_SECRET` and `PLATFORM_JWT_SECRET`.
2. **Every API request is validated server-side**. When the SDK calls `getMe()`, `refresh()`, or any other API method, the Auth API verifies the JWT signature before processing the request.
3. **Client-side JWT reading is for UX, not security**. The SDK decodes the JWT to extract claims (userId, roles, permissions) for rendering decisions. If a user tampered with the JWT payload in the `auth_token` cookie, the next API call would reject it.
4. **The middleware uses JWT claims for routing, not authorization**. If the middleware reads a role from the JWT to redirect a user, the worst case of tampering is that the user sees a page they cannot actually use -- any data fetches on that page would fail because the API rejects the invalid token.

### Cookie Security Summary

| Threat | Mitigation |
|--------|-----------|
| XSS stealing tokens | `auth_token` and `refresh_token` are httpOnly -- JavaScript cannot read them |
| CSRF on refresh | `refresh_token` uses `sameSite: strict` and is path-scoped to `/api/auth` |
| Token interception | `secure: true` in production ensures cookies are only sent over HTTPS |
| Session tampering | `auth_session` is readable but is not a security credential. All auth decisions are made server-side using the httpOnly JWT. |
| JWT forgery | JWT signatures are verified by the Auth API on every request. The SDK only decodes (does not verify) for client-side UX purposes. |

### Permission Cache

The Auth API uses an in-memory permission cache with a 60-second TTL, keyed by `userId:tenantId`. This means permission changes (role assignments, permission grants) take up to 60 seconds to propagate. For immediate effect, the user must re-authenticate.
