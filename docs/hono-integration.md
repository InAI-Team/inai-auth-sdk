# Hono Integration

Guide for integrating InAI Auth into a Hono application using the `@inai-dev/hono` package. Optimized for Cloudflare Workers.

## @inai-dev/hono Package

The `@inai-dev/hono` package provides:

- `inaiAuthMiddleware` - Middleware for JWT verification and route protection
- `requireAuth` - Granular role/permission guard middleware
- `createAuthRoutes()` - API route handlers for app user auth
- `createPlatformAuthRoutes()` - API route handlers for platform auth
- `getAuth()` / `setAuthCookies()` / `clearAuthCookies()` - Cookie and auth helpers

## Environment Variables

```env
# Required — your publishable key
INAI_PUBLISHABLE_KEY=pk_live_...
```

The API URL (`https://apiauth.inai.dev`) is built into the SDK — no configuration needed.

For Cloudflare Workers, bind as a secret:

```toml
# wrangler.toml
[vars]
INAI_PUBLISHABLE_KEY = "pk_live_..."
```

## Setup

### 1. Middleware

```ts
import { Hono } from "hono";
import { inaiAuthMiddleware } from "@inai-dev/hono";

const app = new Hono();

// Protect all routes except public ones
app.use(
  "*",
  inaiAuthMiddleware({
    authMode: "app", // or "platform" for admin panels
    publicRoutes: ["/", "/about", "/health"],
  }),
);
```

#### Middleware Configuration

```ts
interface InAIHonoMiddlewareConfig {
  authMode?: "app" | "platform";  // default: "app"
  publicRoutes?: string[] | ((path: string) => boolean);
  onUnauthorized?: (c: Context) => Response | Promise<Response>;
}
```

The middleware will:
1. Skip public routes (and `/api/auth/*` paths automatically)
2. Read the `auth_token` cookie
3. Verify the JWT signature using ES256 via JWKS (public keys cached for 5 minutes)
4. Populate `c.get("inaiAuth")` with an `AuthObject`
5. Return 401 if no valid token is found (customizable via `onUnauthorized`)

#### Public Routes as a Function

```ts
app.use(
  "*",
  inaiAuthMiddleware({
    publicRoutes: (path) => path.startsWith("/public/"),
  }),
);
```

#### Custom Unauthorized Handler

```ts
app.use(
  "*",
  inaiAuthMiddleware({
    onUnauthorized: (c) =>
      c.json({ error: "Please sign in" }, 401),
  }),
);
```

### 2. Route Protection with requireAuth

For granular role/permission checks on specific routes:

```ts
import { requireAuth } from "@inai-dev/hono";

// Require authentication
app.get("/dashboard", requireAuth(), (c) => {
  const auth = c.get("inaiAuth");
  return c.json({ userId: auth?.userId });
});

// Require specific role
app.get("/admin", requireAuth({ role: "admin" }), (c) => {
  return c.json({ message: "Admin access granted" });
});

// Require specific permission
app.delete("/posts/:id", requireAuth({ permission: "posts:delete" }), (c) => {
  return c.json({ message: "Post deleted" });
});
```

### 3. API Routes (App Users)

```ts
import { Hono } from "hono";
import { createAuthRoutes } from "@inai-dev/hono";

const app = new Hono();

// Mount auth routes at /api/auth/*
const authRoutes = createAuthRoutes({
  publishableKey: "pk_live_...", // or read from env
});

app.route("/api/auth", authRoutes);
```

Handles the following endpoints automatically:
- `POST /api/auth/login` — User login (returns `{ user }` or `{ mfa_required, mfa_token }`)
- `POST /api/auth/register` — User registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — User logout
- `POST /api/auth/forgot-password` — Request password reset email
- `POST /api/auth/reset-password` — Reset password with token
- `POST /api/auth/verify-email` — Verify email address

### 4. Platform Auth Routes (Admin Panels)

```ts
import { createPlatformAuthRoutes } from "@inai-dev/hono";

const platformAuthRoutes = createPlatformAuthRoutes();

app.route("/api/auth", platformAuthRoutes);
```

Handles:
- `POST /api/auth/login` — Platform user login
- `POST /api/auth/register` — Platform user + tenant registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current platform user

## Auth Helpers

### getAuth()

Read the current auth state from the Hono context:

```ts
import { getAuth } from "@inai-dev/hono";

app.get("/api/profile", (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json({ userId: auth.userId, roles: auth.roles });
});
```

### Cookie Helpers

For custom auth flows or manual token management:

```ts
import { setAuthCookies, clearAuthCookies } from "@inai-dev/hono";

// Set auth cookies after manual authentication
app.post("/api/custom-login", async (c) => {
  const tokens = await client.login({ email, password });
  setAuthCookies(c, tokens, user);
  return c.json({ success: true });
});

// Clear all auth cookies (manual logout)
app.post("/api/custom-logout", (c) => {
  clearAuthCookies(c);
  return c.json({ success: true });
});
```

### Token Extraction

```ts
import { getTokenFromContext, getRefreshTokenFromContext } from "@inai-dev/hono";

app.get("/api/data", (c) => {
  const accessToken = getTokenFromContext(c);
  const refreshToken = getRefreshTokenFromContext(c);
  // Use tokens for backend API calls
});
```

### Session Expiry Check

```ts
import { isSessionExpired } from "@inai-dev/hono";

app.use("*", async (c, next) => {
  if (isSessionExpired(c)) {
    clearAuthCookies(c);
    return c.json({ error: "Session expired" }, 401);
  }
  await next();
});
```

## Complete Example (Cloudflare Workers)

```ts
import { Hono } from "hono";
import { inaiAuthMiddleware, createAuthRoutes, requireAuth, getAuth } from "@inai-dev/hono";

type Bindings = {
  INAI_PUBLISHABLE_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Mount auth routes
app.route("/api/auth", createAuthRoutes({
  publishableKey: "", // Will be overridden per-request below
}));

// Apply auth middleware
app.use("*", inaiAuthMiddleware({
  publicRoutes: ["/", "/about"],
}));

// Public route
app.get("/", (c) => c.json({ status: "ok" }));

// Protected route
app.get("/api/dashboard", (c) => {
  const auth = getAuth(c);
  return c.json({ userId: auth?.userId });
});

// Admin-only route
app.get("/api/admin", requireAuth({ role: "admin" }), (c) => {
  return c.json({ message: "Admin panel" });
});

export default app;
```

## Exports Reference

```ts
// Middleware
import { inaiAuthMiddleware, requireAuth } from "@inai-dev/hono";

// Auth helpers
import {
  getAuth,
  setAuthCookies,
  clearAuthCookies,
  isSessionExpired,
  getTokenFromContext,
  getRefreshTokenFromContext,
} from "@inai-dev/hono";

// Route handlers
import { createAuthRoutes, createPlatformAuthRoutes } from "@inai-dev/hono";

// Re-exported types
import type { AuthObject, UserResource, OrganizationResource } from "@inai-dev/hono";
import type { InAIHonoMiddlewareConfig, RequireAuthConfig } from "@inai-dev/hono";
```
