# @inai-dev/tanstack-start

Full TanStack Start integration for InAI Auth. Includes request middleware, server function middleware, server-side auth helpers, API route handlers, React hooks, and UI components.

## Installation

```bash
npm install @inai-dev/tanstack-start
```

## Environment Variables

```env
# Required — your publishable key (server-only, NOT exposed to the browser)
INAI_PUBLISHABLE_KEY=pk_live_...
```

## Setup

### 1. Request Middleware

```ts
// app/ssr.tsx
import { createStart } from "@tanstack/react-start";
import { createInAIAuthMiddleware } from "@inai-dev/tanstack-start/middleware";

const authMiddleware = createInAIAuthMiddleware({
  publicRoutes: ["/", "/about", "/login", "/register"],
  signInUrl: "/login",
  // onUnauthorized: "null",  // pass auth: null instead of redirecting (useful for API routes)
  // jwksUrl: "https://apiauth.inai.dev/.well-known/jwks.json", // optional override
});

export default createStart(() => ({
  requestMiddleware: [authMiddleware],
}));
```

> All tokens are cryptographically verified using ES256 (ECDSA P-256). Public keys are fetched from the JWKS endpoint and cached for 5 minutes.

### 2. Provider

```tsx
// app/root.tsx
import { InAIAuthProvider } from "@inai-dev/tanstack-start";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <InAIAuthProvider>{children}</InAIAuthProvider>
      </body>
    </html>
  );
}
```

### 3. API Routes

```ts
// routes/api/auth/$path.ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createAuthRouteHandlers } from "@inai-dev/tanstack-start/server";

const { handleRequest } = createAuthRouteHandlers();

export const APIRoute = createAPIFileRoute("/api/auth/$path")({
  POST: ({ request, params }) => handleRequest(request, params.path),
});
```

Handles the following endpoints automatically:
- `POST /api/auth/login` — User login
- `POST /api/auth/register` — User registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — User logout
- `POST /api/auth/forgot-password` — Password reset request
- `POST /api/auth/reset-password` — Password reset
- `POST /api/auth/verify-email` — Email verification

## Server-Side Auth

### `auth()`

Returns a `ServerAuthObject` with the current authentication state. This function is **synchronous** (unlike Next.js's async `auth()`) because TanStack Start's cookie APIs are synchronous.

```ts
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@inai-dev/tanstack-start/server";

const getDashboard = createServerFn({ method: "GET" }).handler(() => {
  const { userId, has, protect, redirectToSignIn, getToken } = auth();

  // Check if user is authenticated
  if (!userId) {
    redirectToSignIn({ returnTo: "/dashboard" });
  }

  // Check roles/permissions
  if (has({ role: "admin" })) {
    // admin-only logic
  }

  // Protect — throws redirect if unauthorized
  const authed = protect({ permission: "posts:write" });

  return { userId };
});
```

**`ServerAuthObject`:**

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
| `protect(params?)` | `({ role?, permission?, redirectTo? }) => ProtectedAuthObject` | Assert auth or redirect |
| `redirectToSignIn(opts?)` | `({ returnTo? }) => never` | Redirect to sign-in page |

### `currentUser()`

Returns the full user object, or `null` if not authenticated.

```ts
import { createServerFn } from "@tanstack/react-start";
import { currentUser } from "@inai-dev/tanstack-start/server";

const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  const user = await currentUser();
  if (!user) return null;
  return { email: user.email };
});

// Force a fresh fetch from the API (bypasses cached session cookie)
const freshUser = await currentUser({ fresh: true });
```

## Server Function Middleware

For fine-grained auth in individual server functions, use the function middleware instead of (or alongside) the request middleware.

### `createInAIAuthFnMiddleware()`

Injects `auth: AuthObject | null` into the server function context. **Never redirects** — lets the handler decide the response.

```ts
import { createServerFn } from "@tanstack/react-start";
import { createInAIAuthFnMiddleware } from "@inai-dev/tanstack-start/middleware";

const authFn = createInAIAuthFnMiddleware();

const getProfile = createServerFn({ method: "GET" })
  .middleware([authFn])
  .handler(({ context }) => {
    if (!context.auth) throw new Error("Not authenticated");
    return fetchProfile(context.auth.userId);
  });
```

### `requireAuth()`

Guard middleware that throws if the user is not authenticated or lacks a required role/permission. Use after `createInAIAuthFnMiddleware`.

```ts
import { createServerFn } from "@tanstack/react-start";
import {
  createInAIAuthFnMiddleware,
  requireAuth,
} from "@inai-dev/tanstack-start/middleware";

const authFn = createInAIAuthFnMiddleware();

const adminAction = createServerFn({ method: "POST" })
  .middleware([authFn, requireAuth({ role: "admin" })])
  .handler(({ context }) => {
    // context.auth is guaranteed non-null with "admin" role
    return performAdminAction(context.auth.userId);
  });
```

## React Hooks

All hooks are imported from `@inai-dev/tanstack-start`.

### `useAuth()`

```ts
const { isLoaded, isSignedIn, userId, roles, permissions, has, signOut } = useAuth();

has({ role: "admin" });       // check role
has({ permission: "read" });  // check permission
await signOut();
```

### `useUser()`

```ts
const { isLoaded, isSignedIn, user } = useUser();
// user: UserResource | null
```

### `useSession()`

```ts
const { isLoaded, isSignedIn, userId, tenantId, orgId, orgRole } = useSession();
```

### `useOrganization()`

```ts
const { isLoaded, orgId, orgRole } = useOrganization();
```

### `useSignIn()`

```ts
const { signIn, isLoading, error, status, reset } = useSignIn();

await signIn.create({ identifier: "user@example.com", password: "..." });
// status: "idle" | "loading" | "needs_mfa" | "complete" | "error"

// MFA flow
await signIn.attemptMFA({ code: "123456" });
```

### `useSignUp()`

```ts
const { signUp, isLoading, error, status, reset } = useSignUp();

await signUp.create({
  email: "user@example.com",
  password: "...",
  firstName: "Jane",
  lastName: "Doe",
});
// status: "idle" | "loading" | "needs_email_verification" | "complete" | "error"
```

## React Components

All components are imported from `@inai-dev/tanstack-start`.

### `<Protect>`

Renders children only if the user has the required role or permission.

```tsx
<Protect role="admin" fallback={<p>Access denied</p>}>
  <AdminPanel />
</Protect>

<Protect permission="posts:write">
  <Editor />
</Protect>
```

### `<SignedIn>` / `<SignedOut>`

Conditional rendering based on authentication state.

```tsx
<SignedIn>
  <p>Welcome back!</p>
</SignedIn>
<SignedOut>
  <p>Please sign in.</p>
</SignedOut>
```

### `<PermissionGate>`

Permission-based access control.

```tsx
<PermissionGate permission="billing:manage" fallback={<p>No access</p>}>
  <BillingSettings />
</PermissionGate>
```

### `<UserButton>`

User profile menu with avatar and dropdown.

```tsx
<UserButton
  afterSignOutUrl="/"
  showName
  menuItems={[{ label: "Settings", onClick: () => navigate({ to: "/settings" }) }]}
  appearance={{ buttonSize: 36, buttonBg: "#1a1a2e" }}
/>
```

### `<SignIn>`

Sign-in form with MFA support.

```tsx
<SignIn
  redirectUrl="/dashboard"
  onSuccess={() => console.log("Signed in!")}
  onMFARequired={(mfaToken) => navigate({ to: "/mfa" })}
/>
```

### `<OrganizationSwitcher>`

Organization switching dropdown.

```tsx
<OrganizationSwitcher />
```

## Advanced Configuration

### `configureAuth()` / `getAuthConfig()`

Set global configuration early in your app (e.g., in `app/ssr.tsx` or a server initialization file).

```ts
import { configureAuth, getAuthConfig } from "@inai-dev/tanstack-start/server";

configureAuth({
  signInUrl: "/login",
  signUpUrl: "/register",
  afterSignInUrl: "/dashboard",
  afterSignOutUrl: "/",
  publishableKey: "pk_live_...",
});

const config = getAuthConfig();
// { signInUrl, signUpUrl, afterSignInUrl, afterSignOutUrl, publishableKey }
```

### `createRouteMatcher()`

Create a reusable route matcher for middleware logic.

```ts
import { createRouteMatcher } from "@inai-dev/tanstack-start/middleware";

const isPublic = createRouteMatcher(["/", "/about", "/api/(.*)"]);

const authMiddleware = createInAIAuthMiddleware({
  publicRoutes: isPublic,
});
```

### `beforeAuth` / `afterAuth` Hooks

Run custom logic before or after the auth check in request middleware.

```ts
import { createInAIAuthMiddleware } from "@inai-dev/tanstack-start/middleware";

const authMiddleware = createInAIAuthMiddleware({
  publicRoutes: ["/", "/login"],
  signInUrl: "/login",
  beforeAuth: (request) => {
    // Runs before auth check — return a Response to short-circuit
  },
  afterAuth: (auth, request) => {
    // Runs after auth check on protected routes
    const pathname = new URL(request.url).pathname;
    if (auth.userId && pathname === "/login") {
      return Response.redirect(new URL("/dashboard", request.url));
    }
  },
});
```

### Platform Auth

For admin panels using platform authentication:

```ts
// Middleware
const authMiddleware = createInAIAuthMiddleware({
  authMode: "platform",
  publicRoutes: ["/login"],
});

// API routes
import { createPlatformAuthRouteHandlers } from "@inai-dev/tanstack-start/server";

const { handleRequest } = createPlatformAuthRouteHandlers();

export const APIRoute = createAPIFileRoute("/api/platform/auth/$path")({
  GET: ({ request, params }) => handleRequest(request, params.path),
  POST: ({ request, params }) => handleRequest(request, params.path),
});
```

Platform route handlers support:
- `POST /login`, `/register`, `/mfa-challenge`, `/refresh`, `/logout`
- `GET /me`

## Exports Reference

### `@inai-dev/tanstack-start`

| Export | Kind | Description |
|---|---|---|
| `InAIAuthProvider` | Component | Auth context provider |
| `Protect` | Component | Role/permission gate |
| `SignedIn` | Component | Renders when signed in |
| `SignedOut` | Component | Renders when signed out |
| `PermissionGate` | Component | Permission-based gate |
| `UserButton` | Component | User profile menu |
| `SignIn` | Component | Sign-in form |
| `OrganizationSwitcher` | Component | Org switcher |
| `useAuth` | Hook | Auth state & actions |
| `useUser` | Hook | User data |
| `useSession` | Hook | Session info |
| `useSessionTimeout` | Hook | Session timeout handling |
| `useOrganization` | Hook | Organization data |
| `useSignIn` | Hook | Sign-in flow |
| `useSignUp` | Hook | Sign-up flow |
| `COOKIE_AUTH_TOKEN` | Constant | `"auth_token"` |
| `COOKIE_REFRESH_TOKEN` | Constant | `"refresh_token"` |
| `COOKIE_AUTH_SESSION` | Constant | `"auth_session"` |

### `@inai-dev/tanstack-start/server`

| Export | Kind | Description |
|---|---|---|
| `auth` | Function | Get `ServerAuthObject` (sync) |
| `currentUser` | Function | Get current user |
| `createAuthRouteHandlers` | Function | App auth route handlers |
| `createPlatformAuthRouteHandlers` | Function | Platform auth route handlers |
| `configureAuth` | Function | Set global config |
| `getAuthConfig` | Function | Get resolved config |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |
| `isSessionExpired` | Function | Check session max duration |
| `getAuthTokenFromCookies` | Function | Get access token |
| `getRefreshTokenFromCookies` | Function | Get refresh token |

### `@inai-dev/tanstack-start/middleware`

| Export | Kind | Description |
|---|---|---|
| `createInAIAuthMiddleware` | Function | Request-level auth middleware |
| `createInAIAuthFnMiddleware` | Function | Server function auth middleware |
| `requireAuth` | Function | Auth guard middleware |
| `createRouteMatcher` | Function | Route pattern matcher |
| `InAITanStackMiddlewareConfig` | Type | Middleware config interface |
| `RequireAuthConfig` | Type | Guard config interface |

## Exported Types

```ts
import type {
  AuthObject,
  ServerAuthObject,
  ProtectedAuthObject,
  UserResource,
  PlatformUserResource,
  SessionResource,
  OrganizationResource,
  InAIAuthConfig,
  InAIAuthErrorBody,
  SignInResult,
  SignUpResult,
} from "@inai-dev/tanstack-start";

import type {
  InAITanStackMiddlewareConfig,
  RequireAuthConfig,
} from "@inai-dev/tanstack-start/middleware";
```

## Differences from `@inai-dev/nextjs`

| Concept | Next.js | TanStack Start |
|---------|---------|----------------|
| Read cookie | `(await cookies()).get(name)?.value` | `getCookie(name)` |
| Write cookie | `(await cookies()).set(name, val, opts)` | `setCookie(name, val, opts)` |
| Redirect | `redirect(url)` from `next/navigation` | `throw redirect({ to, search })` from `@tanstack/react-router` |
| `auth()` | `async` (returns `Promise`) | **sync** (returns directly) |
| Middleware | `export function middleware(req)` returns `NextResponse` | `createMiddleware().server(({ next }) => next({ context }))` |
| Auth context | `x-inai-auth` header | `next({ context: { auth } })` — type-safe |
| API routes | `export { GET, POST }` catch-all | `createAPIFileRoute()({ POST: handler })` |
| Response | `NextResponse.json()` | `Response.json()` (Web API standard) |
| Route handlers | `createAuthRoutes()` returns `{ GET, POST }` | `createAuthRouteHandlers()` returns `{ handleRequest }` |

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
