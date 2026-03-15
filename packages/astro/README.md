# @inai-dev/astro

Full Astro integration for InAI Auth. Includes middleware with automatic token refresh, API route handlers, and server-side helpers.

## Installation

```bash
npm install @inai-dev/astro
```

## Environment Variables

```env
# Required — your publishable key
INAI_PUBLISHABLE_KEY=pk_live_...
```

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

> **Note:** Auth requires `output: "server"` (or `"hybrid"`) since middleware and API routes run on the server.

### 2. Middleware

```ts
// src/middleware.ts
import { inaiAstroMiddleware } from "@inai-dev/astro/middleware";

export const onRequest = inaiAstroMiddleware({
  publicRoutes: ["/", "/about", "/login"],
  signInUrl: "/login",
  // jwksUrl: "https://apiauth.inai.dev/.well-known/jwks.json", // optional override
});
```

> All tokens are cryptographically verified using ES256 (ECDSA P-256). Public keys are fetched from the JWKS endpoint and cached for 5 minutes.

The middleware automatically:
- Skips public routes, `/api/*`, and `/_*` paths
- Validates the auth token from cookies
- Refreshes expired tokens via `/api/auth/refresh` when a refresh token exists
- Sets `Astro.locals.auth` with the `AuthObject` for authenticated requests
- Redirects to sign-in for unauthenticated requests on protected routes

### 3. API Routes

Auth uses standard Astro API routes (not Astro Actions). This is intentional: the middleware refreshes tokens via self-fetch to `/api/auth/refresh`, which requires a real HTTP endpoint. API routes also allow direct cookie manipulation and standard REST semantics for auth flows.

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

#### Calling from the client

```ts
// Login
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const { user, mfa_required, mfa_token } = await res.json();

// MFA (if required)
const res = await fetch("/api/auth/mfa-challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mfa_token, code }),
});

// Logout
await fetch("/api/auth/logout", { method: "POST" });
```

### 4. Server-Side Auth

#### `auth()`

Returns the `AuthObject` from the current request context (populated by middleware).

```astro
---
import { auth } from "@inai-dev/astro/server";

const authObj = auth(Astro);
if (!authObj?.userId) {
  return Astro.redirect("/login");
}

// Check roles/permissions
if (authObj.has({ role: "admin" })) {
  // admin-only logic
}
---
<p>User: {authObj.userId}</p>
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

#### `currentUser()`

Fetches the full `UserResource` from the API.

```astro
---
import { currentUser } from "@inai-dev/astro/server";

const user = await currentUser(Astro);
if (!user) return Astro.redirect("/login");
---
<p>{user.email}</p>
```

#### Cookie Helpers

For advanced use cases (custom auth flows, manual token management):

```ts
import { setAuthCookies, clearAuthCookies } from "@inai-dev/astro/server";

// Set auth cookies after manual authentication
setAuthCookies(Astro.cookies, tokens, user);

// Clear all auth cookies (manual logout)
clearAuthCookies(Astro.cookies);
```

## Exports Reference

### `@inai-dev/astro`

| Export | Kind | Description |
|---|---|---|
| `inaiAuth` | Function | Astro integration |
| `inaiAstroMiddleware` | Function | Auth middleware |
| `auth` | Function | Get `AuthObject` from context |
| `currentUser` | Function | Get current user from API |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |
| `createAuthRoutes` | Function | API route handlers |

### `@inai-dev/astro/middleware`

| Export | Kind | Description |
|---|---|---|
| `inaiAstroMiddleware` | Function | Auth middleware with token refresh |

### `@inai-dev/astro/server`

| Export | Kind | Description |
|---|---|---|
| `auth` | Function | Get `AuthObject` from context |
| `currentUser` | Function | Get current user |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |

### `@inai-dev/astro/api-routes`

| Export | Kind | Description |
|---|---|---|
| `createAuthRoutes` | Function | Create API route handlers |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |

## Exported Types

```ts
import type { InAIAstroConfig } from "@inai-dev/astro";
import type { InAIAstroMiddlewareConfig } from "@inai-dev/astro/middleware";
import type { AstroCookies, AstroAPIContext } from "@inai-dev/astro/api-routes";
import type { AuthObject, UserResource, OrganizationResource } from "@inai-dev/astro";
```

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
