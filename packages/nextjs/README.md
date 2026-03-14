# @inai-dev/nextjs

Full Next.js integration for InAI Auth. Includes middleware, server-side auth helpers, API route handlers, React hooks, and UI components.

## Installation

```bash
npm install @inai-dev/nextjs
```

## Environment Variables

```env
# Required — your publishable key (server-only, NOT exposed to the browser)
INAI_PUBLISHABLE_KEY=pk_live_...
```

## Setup

### 1. Middleware

```ts
// middleware.ts
import { inaiAuthMiddleware } from "@inai-dev/nextjs/middleware";

export default inaiAuthMiddleware({
  publicRoutes: ["/", "/about", "/login"],
  signInUrl: "/login",
  // jwksUrl: "https://apiauth.inai.dev/.well-known/jwks.json", // optional override
});

export const config = { matcher: ["/((?!_next|static|favicon.ico).*)"] };
```

> All tokens are cryptographically verified using ES256 (ECDSA P-256). Public keys are fetched from the JWKS endpoint and cached for 5 minutes.

### 2. Provider

```tsx
// app/layout.tsx
import { InAIAuthProvider } from "@inai-dev/nextjs";

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
// app/api/auth/[...inai]/route.ts
import { createAuthRoutes } from "@inai-dev/nextjs/server";

export const { GET, POST } = createAuthRoutes();
```

Handles the following endpoints automatically:
- `POST /api/auth/login` — User login
- `POST /api/auth/register` — User registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — User logout

## Server-Side Auth

### `auth()`

Returns a `ServerAuthObject` with the current authentication state.

```ts
import { auth } from "@inai-dev/nextjs/server";

export default async function Dashboard() {
  const { userId, has, protect, redirectToSignIn, getToken } = await auth();

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

  // Get the access token
  const token = await getToken();

  return <p>User: {userId}</p>;
}
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
| `getToken()` | `() => Promise<string \| null>` | Get the access token |
| `has(params)` | `({ role?, permission? }) => boolean` | Check role or permission |
| `protect(params?)` | `({ role?, permission?, redirectTo? }) => ProtectedAuthObject` | Assert auth or redirect |
| `redirectToSignIn(opts?)` | `({ returnTo? }) => never` | Redirect to sign-in page |

### `currentUser()`

Returns the full user object, or `null` if not authenticated.

```ts
import { currentUser } from "@inai-dev/nextjs/server";

export default async function Profile() {
  const user = await currentUser();
  if (!user) return null;

  return <p>{user.email}</p>;
}

// Force a fresh fetch from the API (bypasses cached session)
const freshUser = await currentUser({ fresh: true });
```

## React Hooks

All hooks are imported from `@inai-dev/nextjs`.

### `useAuth()`

```ts
const { isLoaded, isSignedIn, userId, has, signOut } = useAuth();

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

All components are imported from `@inai-dev/nextjs`.

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
  menuItems={[{ label: "Settings", onClick: () => router.push("/settings") }]}
  appearance={{ buttonSize: 36, buttonBg: "#1a1a2e" }}
/>
```

### `<SignIn>`

Sign-in form with MFA support.

```tsx
<SignIn
  redirectUrl="/dashboard"
  onSuccess={() => console.log("Signed in!")}
  onMFARequired={(mfaToken) => router.push("/mfa")}
/>
```

### `<OrganizationSwitcher>`

Organization switching dropdown.

```tsx
<OrganizationSwitcher />
```

## Advanced Configuration

### `configureAuth()` / `getAuthConfig()`

Set global configuration early in your app (e.g., in `layout.tsx` or a server initialization file).

```ts
import { configureAuth, getAuthConfig } from "@inai-dev/nextjs/server";

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
import { createRouteMatcher } from "@inai-dev/nextjs/middleware";

const isPublic = createRouteMatcher(["/", "/about", "/api/(.*)"]);
const isAdmin = createRouteMatcher(["/admin(.*)"]);
```

### `withInAIAuth()`

Compose InAI auth with your existing middleware.

```ts
import { withInAIAuth } from "@inai-dev/nextjs/middleware";

export default withInAIAuth(
  (req) => {
    // Your custom middleware logic
    return NextResponse.next();
  },
  {
    publicRoutes: ["/", "/login"],
    signInUrl: "/login",
    beforeAuth: (req) => {
      // Runs before auth check
    },
    afterAuth: (auth, req) => {
      // Runs after auth check
      if (auth.userId && req.nextUrl.pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    },
  }
);
```

## Exports Reference

### `@inai-dev/nextjs`

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
| `useOrganization` | Hook | Organization data |
| `useSignIn` | Hook | Sign-in flow |
| `useSignUp` | Hook | Sign-up flow |
| `COOKIE_AUTH_TOKEN` | Constant | `"auth_token"` |
| `COOKIE_REFRESH_TOKEN` | Constant | `"refresh_token"` |
| `COOKIE_AUTH_SESSION` | Constant | `"auth_session"` |

### `@inai-dev/nextjs/server`

| Export | Kind | Description |
|---|---|---|
| `auth` | Function | Get `ServerAuthObject` |
| `currentUser` | Function | Get current user |
| `createAuthRoutes` | Function | Auth route handlers |
| `configureAuth` | Function | Set global config |
| `getAuthConfig` | Function | Get resolved config |
| `setAuthCookies` | Function | Set auth cookies |
| `clearAuthCookies` | Function | Clear auth cookies |
| `getAuthTokenFromCookies` | Function | Get access token |
| `getRefreshTokenFromCookies` | Function | Get refresh token |

### `@inai-dev/nextjs/middleware`

| Export | Kind | Description |
|---|---|---|
| `inaiAuthMiddleware` | Function | Auth middleware |
| `withInAIAuth` | Function | Compose middleware |
| `createRouteMatcher` | Function | Route pattern matcher |

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
} from "@inai-dev/nextjs";

import type {
  InAIMiddlewareConfig,
} from "@inai-dev/nextjs/middleware";
```

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
