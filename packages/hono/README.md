# @inai-dev/hono

Full Hono integration for InAI Auth. Includes middleware with automatic token refresh, route protection with RBAC, and API route handlers. Works on Cloudflare Workers, Node.js, Deno, and Bun.

## Installation

```bash
npm install @inai-dev/hono
```

## Environment Variables

```env
# Required — your publishable key
INAI_PUBLISHABLE_KEY=pk_live_...
```

> On Cloudflare Workers, set this as a secret: `wrangler secret put INAI_PUBLISHABLE_KEY`

## Setup

### 1. Middleware

```ts
import { Hono } from "hono";
import { inaiAuthMiddleware } from "@inai-dev/hono/middleware";

const app = new Hono();

app.use(
  "*",
  inaiAuthMiddleware({
    publicRoutes: ["/", "/health", "/api/public/*"],
  })
);
```

The middleware automatically:
- Skips public routes (supports glob patterns with `*`)
- Validates the auth token from `Authorization: Bearer <token>` header or cookies
- Refreshes expired tokens when a refresh token exists in cookies
- Sets `c.get("inaiAuth")` with the `AuthObject` for authenticated requests
- Returns `401 Unauthorized` for unauthenticated requests on protected routes
- Uses `hono/cookie` for cookie parsing (works across all runtimes)

#### Configuration

```ts
inaiAuthMiddleware({
  // Auth mode: "app" (default) or "platform" (admin panel auth)
  authMode: "app",

  // Routes that don't require authentication
  publicRoutes: ["/", "/health", "/api/public/*"],
  // Or use a function for dynamic matching
  publicRoutes: (path) => path.startsWith("/public"),

  // Custom unauthorized handler (default: 401 JSON response)
  onUnauthorized: (c) => c.json({ error: "Please sign in" }, 401),

  // JWKS endpoint for ES256 token verification (optional)
  jwksUrl: "https://apiauth.inai.dev/.well-known/jwks.json",

  // InAIAuthClient config (optional if using env vars)
  publishableKey: "pk_live_...",
});
```

> All tokens are cryptographically verified using ES256 (ECDSA P-256). Public keys are fetched from the JWKS endpoint and cached for 5 minutes.

### 2. Route Protection (RBAC)

```ts
import { requireAuth } from "@inai-dev/hono/middleware";

// Require any authenticated user
app.get("/api/profile", requireAuth(), (c) => {
  const auth = c.get("inaiAuth");
  return c.json({ userId: auth!.userId });
});

// Require a specific role
app.get("/api/admin", requireAuth({ role: "admin" }), (c) => {
  return c.json({ message: "Admin area" });
});

// Require a specific permission
app.post("/api/posts", requireAuth({ permission: "posts:write" }), (c) => {
  return c.json({ message: "Post created" });
});
```

`requireAuth()` returns:
- `401` if no auth or no `userId`
- `403` if the user lacks the required `role` or `permission`

### 3. API Routes

```ts
import { createAuthRoutes } from "@inai-dev/hono/api-routes";

const authApp = createAuthRoutes({
  publishableKey: "pk_live_...",
});

app.route("/api/auth", authApp);
```

Handles the following endpoints automatically:
- `POST /api/auth/login` — User login (returns `{ user }` or `{ mfa_required, mfa_token }`)
- `POST /api/auth/register` — User registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — User logout

### 4. Auth Helpers

#### `getAuth(c)`

Returns the `AuthObject` from the context (populated by middleware).

```ts
import { getAuth } from "@inai-dev/hono";

app.get("/api/me", (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Not signed in" }, 401);
  }
  return c.json({ userId: auth.userId, orgId: auth.orgId });
});
```

**`AuthObject`:**

| Property | Type | Description |
|---|---|---|
| `userId` | `string \| null` | Current user ID |
| `tenantId` | `string \| null` | Tenant ID |
| `appId` | `string \| null` | Application ID |
| `envId` | `string \| null` | Environment ID |
| `orgId` | `string \| null` | Active organization ID |
| `orgRole` | `string \| null` | Role in active organization |
| `sessionId` | `string \| null` | Session ID |
| `getToken()` | `() => Promise<string \| null>` | Get the access token |
| `has(params)` | `({ role?, permission? }) => boolean` | Check role or permission |

#### Cookie Helpers

For advanced use cases (custom auth flows, manual token management):

```ts
import { setAuthCookies, clearAuthCookies } from "@inai-dev/hono";

// Set auth cookies after manual authentication
setAuthCookies(c, tokens, user);

// Clear all auth cookies (manual logout)
clearAuthCookies(c);
```

#### Token Extraction

```ts
import { getTokenFromContext, getRefreshTokenFromContext } from "@inai-dev/hono";

// Get access token from Authorization header or cookies
const token = getTokenFromContext(c);

// Get refresh token from cookies
const refreshToken = getRefreshTokenFromContext(c);
```

## Full Example

```ts
import { Hono } from "hono";
import {
  inaiAuthMiddleware,
  requireAuth,
  createAuthRoutes,
  getAuth,
} from "@inai-dev/hono";

const app = new Hono();

// Auth middleware — protects all routes except public ones
app.use(
  "*",
  inaiAuthMiddleware({
    publicRoutes: ["/", "/health", "/api/auth/*"],
  })
);

// Auth API routes
app.route("/api/auth", createAuthRoutes());

// Public route
app.get("/health", (c) => c.json({ status: "ok" }));

// Protected route — any authenticated user
app.get("/api/profile", (c) => {
  const auth = getAuth(c);
  return c.json({ userId: auth?.userId });
});

// Protected route — admin only
app.get("/api/admin", requireAuth({ role: "admin" }), (c) => {
  return c.json({ message: "Welcome, admin" });
});

export default app;
```

### Cloudflare Workers

```ts
// src/index.ts
import { Hono } from "hono";
import { inaiAuthMiddleware, createAuthRoutes } from "@inai-dev/hono";

const app = new Hono();

app.use(
  "*",
  inaiAuthMiddleware({
    publicRoutes: ["/", "/api/auth/*"],
    publishableKey: "pk_live_...",
  })
);

app.route("/api/auth", createAuthRoutes());

app.get("/api/hello", (c) => {
  const auth = c.get("inaiAuth");
  return c.json({ userId: auth?.userId });
});

export default app;
```

## Platform Mode (Admin Panel)

For admin panels that authenticate against the InAI platform API:

```ts
app.use(
  "*",
  inaiAuthMiddleware({
    authMode: "platform",
    publicRoutes: ["/login"],
  })
);
```

In platform mode, the middleware uses `platformRefresh()` and `platformGetMe()` for token refresh, targeting the platform auth endpoints instead of app user endpoints.

## Type Augmentation

The package augments Hono's `ContextVariableMap` so `c.get("inaiAuth")` is fully typed:

```ts
// Automatic — just import the package
import "@inai-dev/hono";

// c.get("inaiAuth") is typed as AuthObject | null
```

## Exports Reference

### `@inai-dev/hono`

| Export | Kind | Description |
|---|---|---|
| `inaiAuthMiddleware` | Function | Auth middleware |
| `requireAuth` | Function | RBAC route guard |
| `createAuthRoutes` | Function | Auth API route handlers |
| `getAuth` | Function | Get `AuthObject` from context |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |
| `getTokenFromContext` | Function | Extract access token |
| `getRefreshTokenFromContext` | Function | Extract refresh token |

### `@inai-dev/hono/middleware`

| Export | Kind | Description |
|---|---|---|
| `inaiAuthMiddleware` | Function | Auth middleware with token refresh |
| `requireAuth` | Function | RBAC route guard |

### `@inai-dev/hono/api-routes`

| Export | Kind | Description |
|---|---|---|
| `createAuthRoutes` | Function | Create Hono sub-app with auth endpoints |

## Exported Types

```ts
import type {
  InAIHonoMiddlewareConfig,
  RequireAuthConfig,
} from "@inai-dev/hono";

import type {
  AuthObject,
  UserResource,
  OrganizationResource,
} from "@inai-dev/hono";
```

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
