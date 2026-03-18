# Authentication Flows

This document describes every authentication flow supported by InAI Auth, including the HTTP requests, cookie management, and SDK usage for each.

## Login (Email/Password)

### Flow

1. User submits email and password
2. Client sends `POST /api/auth/login` to the Next.js API route
3. API route calls `InAIAuthClient.login()` which hits `POST /api/v1/auth/login` on the InAI Auth API
4. If credentials are valid and MFA is not enabled, the API returns a `TokenPair` (access_token + refresh_token)
5. API route fetches the user profile via `getMe()` and sets three cookies:
   - `auth_token` (httpOnly, path `/`) - JWT access token
   - `refresh_token` (httpOnly, sameSite strict, path `/api/auth`) - refresh token
   - `auth_session` (readable, path `/`) - JSON with user profile, permissions, org context
6. Client `InAIAuthProvider` reads the `auth_session` cookie and updates React state

### SDK Usage

```tsx
"use client";
import { useSignIn } from "@inai-dev/nextjs";

function LoginForm() {
  const { signIn, isLoading, error } = useSignIn();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await signIn.create({
      identifier: form.get("email") as string,
      password: form.get("password") as string,
    });
    if (result.status === "complete") {
      window.location.href = "/dashboard";
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {error && <p>{error}</p>}
      <button disabled={isLoading}>Sign in</button>
    </form>
  );
}
```

## Registration

### Flow

1. User submits email, password, and optional first/last name
2. Client sends `POST /api/auth/register`
3. API route calls `InAIAuthClient.register()` which hits `POST /api/v1/auth/register`
4. Two possible outcomes:
   - **No email verification required**: API returns tokens, cookies are set, user is logged in immediately
   - **Email verification required**: API returns `{ user }` without tokens. The response includes `needs_email_verification: true`

### SDK Usage

```tsx
"use client";
import { useSignUp } from "@inai-dev/nextjs";

function RegisterForm() {
  const { signUp, isLoading, error, status } = useSignUp();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await signUp.create({
      email: form.get("email") as string,
      password: form.get("password") as string,
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
    });
    if (result.status === "complete") {
      window.location.href = "/dashboard";
    }
  }

  if (status === "needs_email_verification") {
    return <p>Check your email to verify your account.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="firstName" placeholder="First name" />
      <input name="lastName" placeholder="Last name" />
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {error && <p>{error}</p>}
      <button disabled={isLoading}>Create account</button>
    </form>
  );
}
```

## Email Verification

### Flow

1. After registration (when verification is required), the API sends an email with a verification link containing a token
2. User clicks the link, which navigates to your verification page
3. Your page calls `InAIAuthClient.verifyEmail(token)` to confirm the email
4. On success, the user can log in normally

### SDK Usage

```ts
import { InAIAuthClient } from "@inai-dev/backend";

const client = new InAIAuthClient();
await client.verifyEmail(token);
```

## MFA Challenge

### Flow

1. User logs in with email/password
2. API detects MFA is enabled and returns `{ mfa_required: true, mfa_token: "..." }` instead of tokens
3. User enters their 6-digit TOTP code from their authenticator app
4. Client sends `POST /api/auth/mfa-challenge` with the `mfa_token` and `code`
5. API route calls `InAIAuthClient.mfaChallenge()` which returns a `TokenPair` on success
6. Cookies are set and the user is logged in

### SDK Usage

The `useSignIn` hook manages this flow automatically:

```tsx
"use client";
import { useSignIn } from "@inai-dev/nextjs";

function LoginWithMFA() {
  const { signIn, isLoading, error, status } = useSignIn();
  const [mfaCode, setMfaCode] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await signIn.create({
      identifier: form.get("email") as string,
      password: form.get("password") as string,
    });
    // If MFA is needed, status changes to "needs_mfa"
  }

  async function handleMFA(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await signIn.attemptMFA({ code: mfaCode });
    if (result.status === "complete") {
      window.location.href = "/dashboard";
    }
  }

  if (status === "needs_mfa") {
    return (
      <form onSubmit={handleMFA}>
        <p>Enter your 6-digit code</p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          required
        />
        {error && <p>{error}</p>}
        <button disabled={isLoading}>Verify</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {error && <p>{error}</p>}
      <button disabled={isLoading}>Sign in</button>
    </form>
  );
}
```

## Token Refresh

### Flow (Automatic in Middleware)

1. Middleware detects that the `auth_token` is expired (by decoding the JWT and checking the `exp` claim)
2. Middleware checks if a `refresh_token` cookie exists
3. Middleware calls `POST /api/auth/refresh` (the app's own API route)
4. The API route uses `InAIAuthClient.refresh()` to get a new token pair from the auth API
5. New cookies are set via `Set-Cookie` headers on the response
6. The original request proceeds with the new tokens

### Flow (Manual in Client)

The `InAIAuthProvider` provides a `refreshSession()` method:

```tsx
"use client";
import { useAuth } from "@inai-dev/nextjs";

function RefreshButton() {
  const { refreshSession } = useAuth();
  // This is rarely needed -- middleware handles refresh automatically
  return <button onClick={refreshSession}>Refresh session</button>;
}
```

### Token Lifetime

- Access tokens have a short lifetime (configured in the API, typically 15-60 minutes)
- Refresh tokens last 7 days (cookie `maxAge: 7 * 24 * 60 * 60`)
- The middleware transparently refreshes expired access tokens on every request

## Logout

### Flow

1. Client calls `signOut()` (from `useAuth()`) or sends `POST /api/auth/logout`
2. API route reads the `refresh_token` cookie
3. Calls `InAIAuthClient.logout(refreshToken)` to invalidate the token server-side
4. Clears all three cookies (`auth_token`, `refresh_token`, `auth_session`)
5. Client-side auth state is cleared and user is redirected to `/login`

### SDK Usage

```tsx
"use client";
import { useAuth } from "@inai-dev/nextjs";

function LogoutButton() {
  const { signOut } = useAuth();

  return <button onClick={signOut}>Sign out</button>;
}
```

Or use the `<UserButton>` component which includes a sign-out option in its dropdown menu:

```tsx
import { UserButton } from "@inai-dev/nextjs";

<UserButton afterSignOutUrl="/login" />
```

## Password Reset

### Flow

1. User requests a password reset:
   ```ts
   await client.forgotPassword("user@example.com");
   ```
2. API sends an email with a reset link containing a token
3. User clicks the link and enters a new password
4. Your page calls:
   ```ts
   await client.resetPassword(token, newPassword);
   ```
5. User can now log in with the new password

### SDK Usage

The password reset flow uses the core `InAIAuthClient` directly since it does not involve cookie management:

```tsx
// Forgot password page
"use client";
import { InAIAuthClient } from "@inai-dev/backend";

const client = new InAIAuthClient({
  publishableKey: process.env.INAI_PUBLISHABLE_KEY!,
});

async function handleForgotPassword(email: string) {
  await client.forgotPassword(email);
  // Show "check your email" message
}

// Reset password page (after clicking email link)
async function handleResetPassword(token: string, newPassword: string) {
  await client.resetPassword(token, newPassword);
  // Redirect to login
}
```

## Organization Switching

### Flow

1. User selects a different organization from the `<OrganizationSwitcher>` or calls the API directly
2. Client sends `POST /api/auth/set-active-organization` with the new `organization_id`
3. The API returns new tokens with updated org claims (`org_id`, `org_role`, `org_permissions`)
4. Cookies are updated with the new tokens
5. Page reloads to reflect the new organization context

### SDK Usage

```tsx
import { OrganizationSwitcher } from "@inai-dev/nextjs";

// Drop-in component
<OrganizationSwitcher />
```

Or manually:

```ts
const client = new InAIAuthClient();
const newTokens = await client.setActiveOrganization(accessToken, orgId);
```

## Platform Authentication

Admin panels use a separate auth flow that hits the `/api/platform/auth/*` endpoints instead of `/api/v1/auth/*`. The flow is identical to app user auth but:

- Uses `createPlatformAuthRoutes()` instead of `createAuthRoutes()`
- Does not require a publishable key
- Authenticates platform users (developers/operators) instead of app users
- Returns `PlatformUserResource` instead of `UserResource`

```ts
// app/api/auth/[...inai]/route.ts (in admin panel)
import { createPlatformAuthRoutes } from "@inai-dev/nextjs/server";

const { GET, POST } = createPlatformAuthRoutes();

export { GET, POST };
```

### Platform Registration

Platform registration creates both a new platform user and a new tenant:

```ts
const res = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@company.com",
    password: "securePassword",
    firstName: "Jane",
    lastName: "Doe",
    tenantName: "My Company",
    tenantSlug: "my-company",
  }),
});
const { user, tenant } = await res.json();
```

### Platform Routes Summary

All frameworks (Next.js, Hono, Express, Astro) expose these platform routes via `createPlatformAuthRoutes()`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Platform user login |
| POST | `/register` | Platform user + tenant registration |
| POST | `/mfa-challenge` | MFA verification |
| POST | `/refresh` | Token refresh |
| POST | `/logout` | Logout |
| GET | `/me` | Get current platform user |

### Session Lifetime

Sessions have a maximum absolute duration of **7 days** from the initial login. This is not a sliding window — the `inai_session_start` cookie is only set during login, not on refresh. The refresh token can extend the access token within this 7-day window, but after 7 days the user must log in again.
