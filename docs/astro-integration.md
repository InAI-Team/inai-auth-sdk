# Astro Integration

Guide for integrating InAI Auth into an Astro 6+ application using the `@inai-dev/astro` package.

## @inai-dev/astro Package

The `@inai-dev/astro` package provides:

- `inaiAuth()` - Astro integration plugin
- `inaiAstroMiddleware` - Middleware for protecting routes with automatic token refresh
- `auth()` / `currentUser()` - Server-side auth helpers
- `createAuthRoutes()` - API route handlers for login, register, logout, refresh, MFA

## Environment Variables

```env
# Required — your publishable key (server-only)
INAI_PUBLISHABLE_KEY=pk_live_...
```

The API URL (`https://apiauth.inai.dev`) is built into the SDK — no configuration needed.

## Setup

### 1. Add Integration

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import { inaiAuth } from "@inai-dev/astro";

export default defineConfig({
  output: "server", // Required — SSR mode for auth
  integrations: [inaiAuth()],
});
```

### 2. Middleware

```ts
// src/middleware.ts
import { inaiAstroMiddleware } from "@inai-dev/astro/middleware";

export const onRequest = inaiAstroMiddleware({
  publicRoutes: ["/", "/about", "/pricing"],
  signInUrl: "/login",
});
```

#### Composing with other middleware

```ts
// src/middleware.ts
import { sequence } from "astro:middleware";
import { inaiAstroMiddleware } from "@inai-dev/astro/middleware";

const authMiddleware = inaiAstroMiddleware({
  publicRoutes: ["/", "/about"],
  signInUrl: "/login",
});

export const onRequest = sequence(authMiddleware, myOtherMiddleware);
```

The middleware will:
1. Check for the `auth_token` cookie
2. Verify the JWT signature using ES256 via JWKS (public keys cached for 5 minutes, with automatic retry on key rotation)
3. Populate `Astro.locals.auth` with an `AuthObject`
4. Redirect unauthenticated users on protected routes to `signInUrl` (preserving the original URL via `?returnTo=`)
5. Attempt token refresh if the access token is expired but a refresh token exists

### 3. API Routes

```ts
// src/pages/api/auth/[path].ts
import { createAuthRoutes } from "@inai-dev/astro/api-routes";

const routes = createAuthRoutes({
  publishableKey: process.env.INAI_PUBLISHABLE_KEY,
});

export const ALL = routes.ALL;
```

Handles the following endpoints automatically:
- `POST /api/auth/login` — User login (returns `{ user }` or `{ mfa_required, mfa_token }`)
- `POST /api/auth/register` — User registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh (also called automatically by middleware)
- `POST /api/auth/logout` — User logout
- `POST /api/auth/forgot-password` — Request password reset email
- `POST /api/auth/reset-password` — Reset password with token
- `POST /api/auth/verify-email` — Verify email address

## Server-Side Auth Helpers

### auth()

Returns the `AuthObject` from the current request context (populated by middleware). This is a synchronous function.

```astro
---
// src/pages/dashboard.astro
import { auth } from "@inai-dev/astro/server";

const authObj = auth(Astro);

if (!authObj?.userId) {
  return Astro.redirect("/login");
}

const canManage = authObj.has({ role: "admin" });
---

<h1>Dashboard</h1>
{canManage && <a href="/admin">Admin Panel</a>}
```

### currentUser()

Fetches the full `UserResource` from the API.

```astro
---
import { currentUser } from "@inai-dev/astro/server";

const user = await currentUser(Astro);
if (!user) return Astro.redirect("/login");
---

<p>{user.email}</p>
```

### In API Endpoints

```ts
// src/pages/api/profile.ts
import type { APIRoute } from "astro";
import { auth } from "@inai-dev/astro/server";

export const GET: APIRoute = async (context) => {
  const authObj = auth(context);
  if (!authObj?.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  return new Response(JSON.stringify({ userId: authObj.userId }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

### Cookie Helpers

For advanced use cases (custom auth flows, manual token management):

```ts
import { setAuthCookies, clearAuthCookies } from "@inai-dev/astro/server";

// Set auth cookies after manual authentication
setAuthCookies(Astro.cookies, tokens, user);

// Clear all auth cookies (manual logout)
clearAuthCookies(Astro.cookies);
```

## Calling Auth From the Client

```ts
// Login
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const { user, mfa_required, mfa_token } = await res.json();

// MFA (if required)
await fetch("/api/auth/mfa-challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mfa_token, code }),
});

// Logout
await fetch("/api/auth/logout", { method: "POST" });
```

## Alternative: Using @inai-dev/backend Directly

You can use the core `InAIAuthClient` from `@inai-dev/backend` directly in Astro server endpoints without the `@inai-dev/astro` integration:

```ts
// src/lib/auth-client.ts
import { InAIAuthClient } from "@inai-dev/backend";

export const authClient = new InAIAuthClient({
  publishableKey: process.env.INAI_PUBLISHABLE_KEY,
});
```

```astro
---
import { authClient } from "../lib/auth-client";

const token = Astro.cookies.get("auth_token")?.value;
if (!token) return Astro.redirect("/login");

try {
  const { data: user } = await authClient.getMe(token);
} catch {
  return Astro.redirect("/login");
}
---

<h1>Dashboard</h1>
```
