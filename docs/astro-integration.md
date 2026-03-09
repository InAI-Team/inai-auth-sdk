# Astro Integration

Guide for integrating InAI Auth into an Astro 6+ application using the `@inai-dev/astro` package.

## @inai-dev/astro Package

The `@inai-dev/astro` package provides:

- `inaiAuth()` - Astro integration plugin
- `inaiAstroMiddleware` - Middleware for protecting routes
- `auth()` / `currentUser()` - Server-side auth helpers
- `<SignedIn>` / `<SignedOut>` - Astro components (`.astro` files)

## Integration Plugin

### astro.config.ts

```ts
import { defineConfig } from "astro/config";
import { inaiAuth } from "@inai-dev/astro";

export default defineConfig({
  integrations: [
    inaiAuth({
      apiUrl: import.meta.env.INAI_API_URL,
      publishableKey: import.meta.env.PUBLIC_INAI_PUBLISHABLE_KEY,
    }),
  ],
  output: "server", // SSR required for auth
});
```

The integration plugin will:
1. Register the middleware automatically
2. Inject auth helpers into `Astro.locals`
3. Configure cookie handling for the Astro request lifecycle

## Middleware

### Using inaiAstroMiddleware

```ts
// src/middleware.ts
import { inaiAstroMiddleware } from "@inai-dev/astro/middleware";

export const onRequest = inaiAstroMiddleware({
  publicRoutes: ["/", "/about", "/pricing"],
  signInUrl: "/login",
});
```

### Composing with other middleware

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
2. Decode JWT claims (without verifying the signature -- the API is the security boundary)
3. Populate `Astro.locals.auth` with an `AuthObject`
4. Redirect unauthenticated users on protected routes to `signInUrl`
5. Attempt token refresh if the access token is expired but a refresh token exists

## Server-Side Auth Helpers

### auth()

Available in `.astro` pages, server endpoints, and middleware:

```astro
---
// src/pages/dashboard.astro
import { auth } from "@inai-dev/astro/server";

const { userId, has, protect } = await auth(Astro);

// Redirect if not signed in
if (!userId) {
  return Astro.redirect("/login");
}

// Or use protect() which redirects automatically
protect();

const canManage = has({ role: "admin" });
---

<h1>Dashboard</h1>
{canManage && <a href="/admin">Admin Panel</a>}
```

### currentUser()

```astro
---
import { currentUser } from "@inai-dev/astro/server";

const user = await currentUser(Astro);
---

{user ? (
  <p>Hello, {user.firstName}</p>
) : (
  <a href="/login">Sign in</a>
)}
```

### In API Endpoints

```ts
// src/pages/api/profile.ts
import type { APIRoute } from "astro";
import { auth } from "@inai-dev/astro/server";

export const GET: APIRoute = async (context) => {
  const { userId, protect } = await auth(context);
  protect();

  // Fetch user data...
  return new Response(JSON.stringify({ userId }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

## Astro Components

### SignedIn / SignedOut

```astro
---
// src/pages/index.astro
import { SignedIn, SignedOut } from "@inai-dev/astro/components";
---

<SignedIn>
  <p>Welcome back!</p>
  <a href="/dashboard">Go to dashboard</a>
</SignedIn>

<SignedOut>
  <p>Please sign in to continue.</p>
  <a href="/login">Sign in</a>
</SignedOut>
```

These are `.astro` components that read auth state from `Astro.locals` and conditionally render their slot content. They work without JavaScript on the client.

## Alternative: Using @inai-dev/backend Directly

You can also use the core `InAIAuthClient` from `@inai-dev/backend` directly in Astro server endpoints and pages without the `@inai-dev/astro` integration:

### Manual Client Setup

```ts
// src/lib/auth-client.ts
import { InAIAuthClient } from "@inai-dev/backend";

export const authClient = new InAIAuthClient({
  apiUrl: import.meta.env.INAI_API_URL,
  publishableKey: import.meta.env.PUBLIC_INAI_PUBLISHABLE_KEY,
});
```

### Manual Cookie Handling

```astro
---
// src/pages/dashboard.astro
import { authClient } from "../lib/auth-client";

const token = Astro.cookies.get("auth_token")?.value;

if (!token) {
  return Astro.redirect("/login");
}

try {
  const { data: user } = await authClient.getMe(token);
  // user is available for rendering
} catch {
  return Astro.redirect("/login");
}
---

<h1>Dashboard</h1>
```

### Manual Login Endpoint

```ts
// src/pages/api/auth/login.ts
import type { APIRoute } from "astro";
import { authClient } from "../../../lib/auth-client";

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();

  try {
    const result = await authClient.login({
      email: body.email,
      password: body.password,
    });

    if (result.mfa_required) {
      return new Response(JSON.stringify({
        mfa_required: true,
        mfa_token: result.mfa_token,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const tokens = result;
    const { data: user } = await authClient.getMe(tokens.access_token!);

    cookies.set("auth_token", tokens.access_token!, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    cookies.set("refresh_token", tokens.refresh_token!, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    cookies.set("auth_session", JSON.stringify({ user, expiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString() }), {
      httpOnly: false,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Login failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

## Environment Variables

| Variable | Astro Prefix | Description |
|----------|-------------|-------------|
| `INAI_API_URL` | None (server only) | InAI Auth API base URL |
| `PUBLIC_INAI_PUBLISHABLE_KEY` | `PUBLIC_` (client-exposed) | Environment publishable key |

In Astro, variables without the `PUBLIC_` prefix are only available server-side. The API URL should remain server-only to avoid exposing internal infrastructure URLs.
