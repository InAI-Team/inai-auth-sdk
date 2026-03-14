# Getting Started

This guide walks you through adding InAI authentication to a Next.js application in under 10 minutes.

## Prerequisites

- Next.js 16+ application
- An InAI Auth account with an application created in the admin panel
- A publishable key for your application's environment (found in the admin panel under your app's Quickstart section)

## 1. Install the SDK

```bash
npm install @inai-dev/nextjs @inai-dev/react
```

## 2. Set Environment Variables

Create or update your `.env.local`:

```env
INAI_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxx
```

- `INAI_PUBLISHABLE_KEY` - The publishable key for your application's environment (found in the admin panel). This is sent as the `X-Publishable-Key` header on all API v1 requests to identify your app and environment. This is a **server-only** variable — it is never exposed to the browser.

## 3. Add the Auth Provider

Wrap your application with `<InAIAuthProvider>` in your root layout. This provides auth state to all client components via React context.

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

## 4. Create the Auth API Route

InAI uses a catch-all API route to proxy authentication requests (login, register, logout, refresh, MFA) through your Next.js server. This keeps tokens in httpOnly cookies that are never exposed to client-side JavaScript.

```ts
// app/api/auth/[...inai]/route.ts
import { createAuthRoutes } from "@inai-dev/nextjs/server";

const { GET, POST } = createAuthRoutes();

export { GET, POST };
```

This single file handles all of the following routes automatically:
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/register` - User registration
- `POST /api/auth/mfa-challenge` - MFA code verification
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Logout and cookie cleanup

## 5. Add Auth Middleware

Create a `middleware.ts` at your project root to protect routes. Unauthenticated users are redirected to the sign-in page. Public routes (static assets, API routes, the login page itself) are automatically excluded.

```ts
// middleware.ts
import { inaiAuthMiddleware } from "@inai-dev/nextjs/middleware";

export default inaiAuthMiddleware({
  publicRoutes: ["/", "/about", "/pricing"],
  signInUrl: "/login",
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## 6. Build a Login Page

Use the `useSignIn` hook for full control, or drop in the pre-built `<SignIn>` component.

### Option A: Using the useSignIn hook

```tsx
"use client";

import { useSignIn } from "@inai-dev/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { signIn, isLoading, error, status } = useSignIn();
  const router = useRouter();
  const [mfaCode, setMfaCode] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const result = await signIn.create({
      identifier: form.get("email") as string,
      password: form.get("password") as string,
    });

    if (result.status === "complete") {
      router.push("/dashboard");
    }
    // If result.status === "needs_mfa", the component re-renders
    // with status === "needs_mfa" and you can show the MFA form
  }

  async function handleMFA(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await signIn.attemptMFA({ code: mfaCode });
    if (result.status === "complete") {
      router.push("/dashboard");
    }
  }

  if (status === "needs_mfa") {
    return (
      <form onSubmit={handleMFA}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          placeholder="6-digit code"
          required
        />
        {error && <p>{error}</p>}
        <button type="submit" disabled={isLoading}>Verify</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p>{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
```

### Option B: Using the SignIn component

```tsx
// app/login/page.tsx
"use client";

import { SignIn } from "@inai-dev/nextjs";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 400, margin: "100px auto" }}>
      <h1>Sign in</h1>
      <SignIn redirectUrl="/dashboard" />
    </div>
  );
}
```

The `<SignIn>` component handles the full login flow including MFA challenge automatically.

## 7. Access Auth State

### In client components

```tsx
"use client";

import { useAuth, useUser } from "@inai-dev/nextjs";

export function Header() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) return <a href="/login">Sign in</a>;

  return (
    <div>
      <span>Hello, {user?.firstName}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

### In server components

```tsx
// app/dashboard/page.tsx
import { auth, currentUser } from "@inai-dev/nextjs/server";

export default async function DashboardPage() {
  const { userId, protect } = await auth();
  protect(); // Redirects to login if not authenticated

  const user = await currentUser();

  return <h1>Welcome, {user?.firstName}</h1>;
}
```

## Next Steps

- [Full Next.js Integration Guide](./nextjs-integration.md) - Middleware configuration, platform auth, server vs client usage
- [Authentication Flows](./authentication-flows.md) - MFA, password reset, email verification
- [Organizations & RBAC](./organizations-rbac.md) - Role-based access control and organization switching
- [API Reference](./api-reference.md) - Complete reference for all exports
