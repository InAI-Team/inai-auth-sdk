# Next.js Integration

Complete guide for integrating InAI Auth into a Next.js 16+ application.

## Setup Overview

A full InAI integration in Next.js consists of four pieces:

1. **Auth Provider** (`<InAIAuthProvider>`) - Wraps your app, provides auth context to client components
2. **API Route** (`app/api/auth/[...inai]/route.ts`) - Proxies auth requests, manages httpOnly cookies
3. **Middleware** (`middleware.ts`) - Protects routes, handles token refresh
4. **Server functions** (`auth()`, `currentUser()`) - Read auth state in server components and server actions

## Provider Setup

Add `<InAIAuthProvider>` to your root layout. It reads the `auth_session` cookie on mount to hydrate client-side auth state.

```tsx
// app/layout.tsx
import { InAIAuthProvider } from "@inai-dev/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <InAIAuthProvider>
          {children}
        </InAIAuthProvider>
      </body>
    </html>
  );
}
```

The provider exposes auth state through these hooks:
- `useAuth()` - `isLoaded`, `isSignedIn`, `userId`, `has()`, `signOut()`
- `useUser()` - `isLoaded`, `isSignedIn`, `user` (full `UserResource`)
- `useSession()` - `isLoaded`, `isSignedIn`, `userId`, `tenantId`, `orgId`, `orgRole`
- `useOrganization()` - `isLoaded`, `orgId`, `orgRole`

## API Route Configuration

### Standard App User Auth

For applications where end users sign in:

```ts
// app/api/auth/[...inai]/route.ts
import { createAuthRoutes } from "@inai-dev/nextjs/server";

const { GET, POST } = createAuthRoutes();

export { GET, POST };
```

The SDK reads `INAI_PUBLISHABLE_KEY` from `process.env` automatically. This creates handlers for:
- `POST /api/auth/login` - Calls the InAI API login endpoint, sets auth cookies on success
- `POST /api/auth/register` - Creates a new user, sets cookies if no email verification required
- `POST /api/auth/mfa-challenge` - Verifies a TOTP code during MFA flow
- `POST /api/auth/refresh` - Uses the refresh token to get new access/refresh tokens
- `POST /api/auth/logout` - Invalidates the refresh token server-side, clears all cookies

### Platform Auth (Admin Panels)

For admin panels where platform users (developers/operators) sign in:

```ts
// app/api/auth/[...inai]/route.ts
import { createPlatformAuthRoutes } from "@inai-dev/nextjs/server";

const { GET, POST } = createPlatformAuthRoutes();

export { GET, POST };
```

Platform auth routes use the `/api/platform/auth/*` endpoints instead of `/api/v1/auth/*`. They do not require a publishable key since platform users are not scoped to a specific application environment.

## Middleware Configuration

### Basic Setup

```ts
// middleware.ts
import { inaiAuthMiddleware } from "@inai-dev/nextjs/middleware";

export default inaiAuthMiddleware({
  publicRoutes: ["/", "/about", "/pricing", "/login", "/register"],
  signInUrl: "/login",
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### How Middleware Works

1. Requests to built-in public routes (`/_next/*`, `/favicon.ico`, `/api/*`, and `signInUrl`) pass through immediately
2. Requests matching your `publicRoutes` list pass through
3. All other requests check for a valid `auth_token` cookie
4. If the token is expired but a `refresh_token` exists, the middleware calls `/api/auth/refresh` to get new tokens transparently
5. If no valid authentication exists, the user is redirected to `signInUrl` with a `returnTo` query parameter

### Public Routes as a Function

For dynamic public route logic:

```ts
export default inaiAuthMiddleware({
  publicRoutes: (req) => {
    return req.nextUrl.pathname.startsWith("/public/");
  },
  signInUrl: "/login",
});
```

### Hooks: beforeAuth and afterAuth

```ts
export default inaiAuthMiddleware({
  publicRoutes: ["/"],
  signInUrl: "/login",

  beforeAuth: (req) => {
    // Runs before any auth check. Return a NextResponse to short-circuit.
    // Useful for redirects, rewrites, or feature flags.
  },

  afterAuth: (auth, req) => {
    // Runs after successful auth. `auth` is an AuthObject.
    // Use for role-based routing:
    if (req.nextUrl.pathname.startsWith("/admin") && !auth.has({ role: "admin" })) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  },
});
```

### createRouteMatcher

A utility to create reusable route matchers from patterns:

```ts
import { inaiAuthMiddleware, createRouteMatcher } from "@inai-dev/nextjs/middleware";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isApiRoute = createRouteMatcher(["/api/webhooks*", "/api/public*"]);

export default inaiAuthMiddleware({
  publicRoutes: ["/", "/login"],
  afterAuth: (auth, req) => {
    if (isAdminRoute(req) && !auth.has({ role: "admin" })) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
});
```

Patterns support:
- Exact match: `/about`
- Inline regex groups: `/admin(.*)` matches `/admin`, `/admin/users`, etc.
- Trailing wildcard: `/api/webhooks*` matches anything starting with `/api/webhooks`
- Full `RegExp` objects for complex patterns

### Composing with Other Middleware (withInAIAuth)

If you use other middleware (e.g., `next-intl`, custom logging), wrap it with `withInAIAuth`:

```ts
// middleware.ts
import { withInAIAuth } from "@inai-dev/nextjs/middleware";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "es"],
  defaultLocale: "en",
});

export default withInAIAuth(intlMiddleware, {
  publicRoutes: ["/", "/login"],
  signInUrl: "/login",
  afterAuth: (auth, req) => {
    // Auth info is serialized to x-inai-auth header before intlMiddleware runs
  },
});
```

`withInAIAuth` resolves auth first, serializes the auth object to an `x-inai-auth` request header, then delegates to your wrapped middleware.

## Server Functions

### auth()

Reads JWT claims from the `auth_token` cookie. The JWT signature was already verified by the middleware using ES256 via JWKS. This function reads the pre-verified claims to make server-side rendering/routing decisions.

```tsx
// In a Server Component
import { auth } from "@inai-dev/nextjs/server";

export default async function Page() {
  const { userId, tenantId, orgId, has, protect, redirectToSignIn } = await auth();

  // Option 1: Redirect if not signed in
  if (!userId) {
    redirectToSignIn({ returnTo: "/dashboard" });
  }

  // Option 2: Protect with role requirement
  const { userId: protectedUserId } = protect({ role: "admin" });
  // If the user lacks the "admin" role, they are redirected to /unauthorized

  // Option 3: Conditional rendering
  const canEdit = has({ permission: "content:write" });

  return <div>{canEdit && <EditButton />}</div>;
}
```

The `protect()` method returns a `ProtectedAuthObject` where `userId` and `tenantId` are guaranteed non-null (`isSignedIn: true`).

### currentUser()

Returns the current `UserResource` from the session cookie, or fetches fresh data from the API:

```tsx
import { currentUser } from "@inai-dev/nextjs/server";

export default async function ProfilePage() {
  // From session cookie (fast, no network request)
  const user = await currentUser();

  // Or fetch fresh from the API
  const freshUser = await currentUser({ fresh: true });

  return <p>{user?.email}</p>;
}
```

### configureAuth()

Optionally configure SDK defaults. This is auto-resolved from environment variables, but you can override:

```ts
// app/layout.tsx or a top-level server file
import { configureAuth } from "@inai-dev/nextjs/server";

configureAuth({
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  afterSignInUrl: "/dashboard",
  afterSignOutUrl: "/sign-in",
  publishableKey: process.env.INAI_PUBLISHABLE_KEY,
});
```

## Server vs Client Component Usage

### Server Components

Use `auth()` and `currentUser()` from `@inai-dev/nextjs/server`:

```tsx
// app/dashboard/page.tsx (Server Component)
import { auth, currentUser } from "@inai-dev/nextjs/server";

export default async function Dashboard() {
  const { protect } = await auth();
  protect(); // Ensure authenticated

  const user = await currentUser();
  return <h1>Welcome, {user?.firstName}</h1>;
}
```

### Client Components

Use hooks and components from `@inai-dev/nextjs`:

```tsx
"use client";

import { useAuth, useUser, SignedIn, SignedOut, UserButton } from "@inai-dev/nextjs";

export function Navbar() {
  return (
    <nav>
      <SignedIn>
        <UserButton showName afterSignOutUrl="/login" />
      </SignedIn>
      <SignedOut>
        <a href="/login">Sign in</a>
      </SignedOut>
    </nav>
  );
}
```

### Server Actions

```ts
"use server";

import { auth } from "@inai-dev/nextjs/server";

export async function updateProfile(formData: FormData) {
  const { userId, protect } = await auth();
  protect(); // Throws redirect if not authenticated

  // userId is guaranteed non-null after protect()
  // ... update user profile
}
```

## Pre-Built Components

All components are client components with inline styles. They are functional starting points that you can replace with your own styled versions.

| Component | Description |
|-----------|-------------|
| `<SignIn>` | Complete login form with MFA support |
| `<UserButton>` | Avatar dropdown with user info and sign-out |
| `<SignedIn>` | Renders children only when authenticated |
| `<SignedOut>` | Renders children only when not authenticated |
| `<Protect>` | Renders children only when user has required role/permission |
| `<PermissionGate>` | Like Protect but for specific permission/role checks |
| `<OrganizationSwitcher>` | Dropdown to switch active organization |
