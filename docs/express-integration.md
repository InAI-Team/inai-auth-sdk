# Express Integration

Guide for integrating InAI Auth into an Express application using the `@inai-dev/express` package.

## @inai-dev/express Package

The `@inai-dev/express` package provides:

- `inaiAuthMiddleware` - Middleware for JWT verification and route protection
- `requireAuth` - Granular role/permission guard middleware
- `createAuthRoutes()` - Express Router for app user auth
- `createPlatformAuthRoutes()` - Express Router for platform auth
- `getAuth()` / `setAuthCookies()` / `clearAuthCookies()` - Cookie and auth helpers

## Prerequisites

Install `cookie-parser` — the Express package reads auth cookies via `req.cookies`:

```bash
npm install cookie-parser @types/cookie-parser
```

## Environment Variables

```env
# Required — your publishable key
INAI_PUBLISHABLE_KEY=pk_live_...
```

The API URL (`https://apiauth.inai.dev`) is built into the SDK — no configuration needed.

## Setup

### 1. Middleware

```ts
import express from "express";
import cookieParser from "cookie-parser";
import { inaiAuthMiddleware } from "@inai-dev/express";

const app = express();

app.use(cookieParser());
app.use(express.json());

// Protect all routes except public ones
app.use(
  inaiAuthMiddleware({
    authMode: "app", // or "platform" for admin panels
    publicRoutes: ["/", "/about", "/health"],
  }),
);
```

#### Middleware Configuration

```ts
interface InAIExpressMiddlewareConfig {
  authMode?: "app" | "platform";  // default: "app"
  publicRoutes?: string[] | ((req: Request) => boolean);
  onUnauthorized?: (req: Request, res: Response, next: NextFunction) => void;
  beforeAuth?: (req: Request, res: Response) => boolean | void;
  afterAuth?: (auth: AuthObject, req: Request, res: Response) => void;
}
```

The middleware will:
1. Skip public routes (and `/api/auth/*` paths automatically)
2. Read the `auth_token` cookie from `req.cookies`
3. Verify the JWT signature using ES256 via JWKS (public keys cached for 5 minutes)
4. Populate `req.auth` with an `AuthObject`
5. Return 401 if no valid token is found (customizable via `onUnauthorized`)

#### Public Routes as a Function

```ts
app.use(
  inaiAuthMiddleware({
    publicRoutes: (req) => req.path.startsWith("/public/"),
  }),
);
```

#### Lifecycle Hooks

```ts
app.use(
  inaiAuthMiddleware({
    publicRoutes: ["/"],

    beforeAuth: (req, res) => {
      // Runs before auth check. Return true to skip auth for this request.
      if (req.headers["x-api-key"] === process.env.INTERNAL_KEY) {
        return true; // Skip JWT verification
      }
    },

    afterAuth: (auth, req, res) => {
      // Runs after successful auth. Use for logging, analytics, etc.
      console.log(`Authenticated: ${auth.userId}`);
    },

    onUnauthorized: (req, res, next) => {
      res.status(401).json({ error: "Please sign in" });
    },
  }),
);
```

### 2. Route Protection with requireAuth

For granular role/permission checks on specific routes:

```ts
import { requireAuth } from "@inai-dev/express";

// Require authentication
app.get("/dashboard", requireAuth(), (req, res) => {
  res.json({ userId: req.auth?.userId });
});

// Require specific role
app.get("/admin", requireAuth({ role: "admin" }), (req, res) => {
  res.json({ message: "Admin access granted" });
});

// Require specific permission
app.delete("/posts/:id", requireAuth({ permission: "posts:delete" }), (req, res) => {
  res.json({ message: "Post deleted" });
});
```

### 3. API Routes (App Users)

```ts
import { createAuthRoutes } from "@inai-dev/express";

// Mount auth routes at /api/auth/*
app.use(
  "/api/auth",
  createAuthRoutes({
    publishableKey: process.env.INAI_PUBLISHABLE_KEY,
  }),
);
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
import { createPlatformAuthRoutes } from "@inai-dev/express";

app.use(
  "/api/auth",
  createPlatformAuthRoutes(),
);
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

Read the current auth state from the request:

```ts
import { getAuth } from "@inai-dev/express";

app.get("/api/profile", (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ userId: auth.userId, roles: auth.roles });
});
```

### Cookie Helpers

For custom auth flows or manual token management:

```ts
import { setAuthCookies, clearAuthCookies } from "@inai-dev/express";

// Set auth cookies after manual authentication
app.post("/api/custom-login", async (req, res) => {
  const tokens = await client.login({ email, password });
  setAuthCookies(res, tokens, user);
  res.json({ success: true });
});

// Clear all auth cookies (manual logout)
app.post("/api/custom-logout", (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true });
});
```

### Token Extraction

```ts
import { getTokenFromRequest, getRefreshTokenFromRequest } from "@inai-dev/express";

app.get("/api/data", (req, res) => {
  const accessToken = getTokenFromRequest(req);
  const refreshToken = getRefreshTokenFromRequest(req);
  // Use tokens for backend API calls
});
```

### Session Expiry Check

```ts
import { isSessionExpired } from "@inai-dev/express";

app.use((req, res, next) => {
  if (isSessionExpired(req)) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Session expired" });
  }
  next();
});
```

## Complete Example (Node.js)

```ts
import express from "express";
import cookieParser from "cookie-parser";
import {
  inaiAuthMiddleware,
  createAuthRoutes,
  requireAuth,
  getAuth,
} from "@inai-dev/express";

const app = express();

// Required middleware
app.use(cookieParser());
app.use(express.json());

// Mount auth routes (before auth middleware so they are accessible)
app.use(
  "/api/auth",
  createAuthRoutes({
    publishableKey: process.env.INAI_PUBLISHABLE_KEY,
  }),
);

// Apply auth middleware
app.use(
  inaiAuthMiddleware({
    publicRoutes: ["/", "/about"],
  }),
);

// Public route
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// Protected route
app.get("/api/dashboard", (req, res) => {
  const auth = getAuth(req);
  res.json({ userId: auth?.userId });
});

// Admin-only route
app.get("/api/admin", requireAuth({ role: "admin" }), (req, res) => {
  res.json({ message: "Admin panel" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## Exports Reference

```ts
// Middleware
import { inaiAuthMiddleware, requireAuth } from "@inai-dev/express";

// Auth helpers
import {
  getAuth,
  setAuthCookies,
  clearAuthCookies,
  isSessionExpired,
  getTokenFromRequest,
  getRefreshTokenFromRequest,
} from "@inai-dev/express";

// Route handlers
import { createAuthRoutes, createPlatformAuthRoutes } from "@inai-dev/express";

// Re-exported types
import type { AuthObject, UserResource, OrganizationResource } from "@inai-dev/express";
import type { InAIExpressMiddlewareConfig, RequireAuthConfig } from "@inai-dev/express";
```
