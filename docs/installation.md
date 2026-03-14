# Installation

## Per-Framework Installation

### Next.js

```bash
npm install @inai-dev/nextjs
```

The `@inai-dev/nextjs` package includes everything needed for Next.js: client hooks (via `@inai-dev/react`), server functions, middleware, and pre-built UI components. Import from the appropriate subpath:

```ts
// Client components and hooks (includes "use client" directive)
import { useAuth, useUser, SignIn, UserButton } from "@inai-dev/nextjs";

// Server-only functions
import { auth, currentUser, createAuthRoutes } from "@inai-dev/nextjs/server";

// Middleware
import { inaiAuthMiddleware } from "@inai-dev/nextjs/middleware";
```

### Astro

```bash
npm install @inai-dev/astro
```

The `@inai-dev/astro` package provides an integration plugin, middleware for protected routes, and server-side auth helpers. Import from the appropriate subpath:

```ts
// Integration plugin
import { inaiAuth } from "@inai-dev/astro";

// Middleware
import { inaiAstroMiddleware } from "@inai-dev/astro/middleware";

// Server-side auth helpers
import { auth, currentUser } from "@inai-dev/astro/server";
```

### React (Standalone)

For non-Next.js React applications (Vite, Remix, CRA), the `@inai-dev/react` package provides framework-agnostic hooks and components:

```bash
npm install @inai-dev/react
```

```ts
import { InAIAuthProvider, useAuth, useUser, SignedIn, SignedOut, Protect } from "@inai-dev/react";
```

You will need to manage token storage and refresh logic yourself when not using the Next.js integration.

### Backend Only (Node.js / Edge)

For backend services that need to call the InAI Auth API (e.g., creating users, managing applications):

```bash
npm install @inai-dev/backend
```

```ts
import { InAIAuthClient } from "@inai-dev/backend";

const client = new InAIAuthClient({
  publishableKey: "pk_live_xxx",
});

// App user operations
const result = await client.login({ email: "user@example.com", password: "..." });
const { data: user } = await client.getMe(accessToken);

// Platform operations (admin)
const apps = await client.listApplications(platformAccessToken);
```

## Environment Variables

### Required

| Variable | Description | Used By |
|----------|-------------|---------|
| `INAI_PUBLISHABLE_KEY` | Environment publishable key | Next.js / Astro (server-only) |

The API URL (`https://apiauth.inai.dev`) is built into the SDK — no configuration needed.

### How Publishable Keys Work

Each InAI application has one or more environments (e.g., `development`, `production`). Each environment has a unique publishable key that looks like `pk_live_xxxxxxxx` or `pk_test_xxxxxxxx`. This key is sent as the `X-Publishable-Key` HTTP header on all `/api/v1/` requests, allowing the API to:

1. Identify which application and environment the request belongs to
2. Apply the correct auth configuration (password policies, MFA settings, etc.)
3. Scope user data to the correct environment

The publishable key is **server-only** — it is never exposed to the browser. Client-side code communicates with your app's own `/api/auth/*` endpoints, which handle the key internally.

## TypeScript

The SDK is written in TypeScript and ships with full type declarations. All types are exported:

```ts
import type {
  AuthObject,
  ServerAuthObject,
  ProtectedAuthObject,
  UserResource,
  PlatformUserResource,
  SessionResource,
  OrganizationResource,
  JWTClaims,
  InAIAuthConfig,
  LoginParams,
  LoginResult,
  TokenPair,
  SignInResult,
  SignUpResult,
  ApplicationResource,
  EnvironmentResource,
  ApplicationStats,
  ApiKeyResource,
  PaginatedResult,
} from "@inai-dev/types";
```

The package uses ESM (`"type": "module"`) and requires Node.js 18+ or a bundler that supports ESM.

## Peer Dependencies

The SDK has optional peer dependencies:

- `react` >= 18.0.0 - Required by `@inai-dev/react` and `@inai-dev/nextjs`
- `next` - Required by `@inai-dev/nextjs`
- `astro` - Required by `@inai-dev/astro`

If you only use the core `InAIAuthClient` (imported from `@inai-dev/backend`), no peer dependencies are required.
