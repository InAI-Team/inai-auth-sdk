# @inai-dev/express

Full Express integration for InAI Auth. Includes middleware with automatic token refresh, route protection with RBAC, and API route handlers.

## Installation

```bash
npm install @inai-dev/express
```

## Environment Variables

```env
# Required — your publishable key
INAI_PUBLISHABLE_KEY=pk_live_...
```

## Setup

### 1. Middleware

```ts
import express from "express";
import { inaiAuthMiddleware } from "@inai-dev/express/middleware";

const app = express();
app.use(express.json());

app.use(
  inaiAuthMiddleware({
    publicRoutes: ["/", "/health", "/api/public/*"],
  })
);
```

The middleware automatically:
- Skips public routes (supports glob patterns with `*`)
- Validates the auth token from `Authorization: Bearer <token>` header or cookies
- Refreshes expired tokens when a refresh token exists in cookies
- Attaches `req.auth` with the `AuthObject` for authenticated requests
- Returns `401 Unauthorized` for unauthenticated requests on protected routes
- Works with or without `cookie-parser` (parses cookies from header as fallback)

#### Configuration

```ts
inaiAuthMiddleware({
  // Auth mode: "app" (default) or "platform" (admin panel auth)
  authMode: "app",

  // Routes that don't require authentication
  publicRoutes: ["/", "/health", "/api/public/*"],
  // Or use a function for dynamic matching
  publicRoutes: (req) => req.path.startsWith("/public"),

  // Custom unauthorized handler (default: 401 JSON response)
  onUnauthorized: (req, res, next) => {
    res.status(401).json({ error: "Please sign in" });
  },

  // Hook: runs before auth check. Return true to skip auth entirely.
  beforeAuth: (req, res) => {
    if (req.headers["x-internal-key"] === "secret") return true;
  },

  // Hook: runs after successful auth
  afterAuth: (auth, req, res) => {
    console.log(`User ${auth.userId} accessed ${req.path}`);
  },

  // JWKS endpoint for ES256 token verification (optional)
  jwksUrl: "https://apiauth.inai.dev/.well-known/jwks.json",

  // InAIAuthClient config (optional if using env vars)
  publishableKey: process.env.INAI_PUBLISHABLE_KEY,
});
```

> All tokens are cryptographically verified using ES256 (ECDSA P-256). Public keys are fetched from the JWKS endpoint and cached for 5 minutes.

### 2. Route Protection (RBAC)

```ts
import { requireAuth } from "@inai-dev/express/middleware";

// Require any authenticated user
app.get("/api/profile", requireAuth(), (req, res) => {
  res.json({ userId: req.auth!.userId });
});

// Require a specific role
app.get("/api/admin", requireAuth({ role: "admin" }), (req, res) => {
  res.json({ message: "Admin area" });
});

// Require a specific permission
app.post("/api/posts", requireAuth({ permission: "posts:write" }), (req, res) => {
  res.json({ message: "Post created" });
});
```

`requireAuth()` returns:
- `401` if no `req.auth` or no `userId`
- `403` if the user lacks the required `role` or `permission`

### 3. API Routes

```ts
import { createAuthRoutes } from "@inai-dev/express/api-routes";

app.use("/api/auth", createAuthRoutes({
  publishableKey: process.env.INAI_PUBLISHABLE_KEY,
}));
```

> **Note:** Requires `express.json()` middleware to parse request bodies.

Handles the following endpoints automatically:
- `POST /api/auth/login` — User login (returns `{ user }` or `{ mfa_required, mfa_token }`)
- `POST /api/auth/register` — User registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — User logout

### 4. Auth Helpers

#### `getAuth(req)`

Returns the `AuthObject` from the request (populated by middleware).

```ts
import { getAuth } from "@inai-dev/express";

app.get("/api/me", (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  res.json({ userId: auth.userId, orgId: auth.orgId });
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
| `roles` | `string[]` | User's global roles |
| `permissions` | `string[]` | User's global permissions |
| `getToken()` | `() => Promise<string \| null>` | Get the access token |
| `has(params)` | `({ role?, permission? }) => boolean` | Check role or permission |

#### Cookie Helpers

For advanced use cases (custom auth flows, manual token management):

```ts
import { setAuthCookies, clearAuthCookies } from "@inai-dev/express";

// Set auth cookies after manual authentication
setAuthCookies(res, tokens, user);

// Clear all auth cookies (manual logout)
clearAuthCookies(res);
```

#### Token Extraction

```ts
import { getTokenFromRequest, getRefreshTokenFromRequest } from "@inai-dev/express";

// Get access token from Authorization header or cookies
const token = getTokenFromRequest(req);

// Get refresh token from cookies
const refreshToken = getRefreshTokenFromRequest(req);
```

## Full Example

```ts
import express from "express";
import {
  inaiAuthMiddleware,
  requireAuth,
  createAuthRoutes,
  getAuth,
} from "@inai-dev/express";

const app = express();
app.use(express.json());

// Auth middleware — protects all routes except public ones
app.use(
  inaiAuthMiddleware({
    publicRoutes: ["/", "/health", "/api/auth/*"],
  })
);

// Auth API routes
app.use("/api/auth", createAuthRoutes());

// Public route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected route — any authenticated user
app.get("/api/profile", (req, res) => {
  const auth = getAuth(req);
  res.json({ userId: auth?.userId });
});

// Protected route — admin only
app.get("/api/admin", requireAuth({ role: "admin" }), (req, res) => {
  res.json({ message: "Welcome, admin" });
});

app.listen(3000);
```

## Platform Mode (Admin Panel)

For admin panels that authenticate against the InAI platform API:

```ts
app.use(
  inaiAuthMiddleware({
    authMode: "platform",
    publicRoutes: ["/login"],
  })
);
```

In platform mode, the middleware uses `platformRefresh()` and `platformGetMe()` for token refresh, targeting the platform auth endpoints instead of app user endpoints.

## Exports Reference

### `@inai-dev/express`

| Export | Kind | Description |
|---|---|---|
| `inaiAuthMiddleware` | Function | Auth middleware |
| `requireAuth` | Function | RBAC route guard |
| `createAuthRoutes` | Function | Auth API route handlers |
| `getAuth` | Function | Get `AuthObject` from request |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |
| `getTokenFromRequest` | Function | Extract access token |
| `getRefreshTokenFromRequest` | Function | Extract refresh token |

### `@inai-dev/express/middleware`

| Export | Kind | Description |
|---|---|---|
| `inaiAuthMiddleware` | Function | Auth middleware with token refresh |
| `requireAuth` | Function | RBAC route guard |

### `@inai-dev/express/api-routes`

| Export | Kind | Description |
|---|---|---|
| `createAuthRoutes` | Function | Create Express Router with auth endpoints |

## Exported Types

```ts
import type {
  InAIExpressMiddlewareConfig,
  RequireAuthConfig,
} from "@inai-dev/express";

import type {
  AuthObject,
  UserResource,
  OrganizationResource,
} from "@inai-dev/express";
```

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
