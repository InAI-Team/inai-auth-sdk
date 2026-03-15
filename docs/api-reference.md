# API Reference

Complete reference for all exports from the InAI Auth SDK.

## @inai-dev/backend (Core)

Import path: `@inai-dev/backend`

### InAIAuthClient

HTTP client for communicating with the InAI Auth API.

```ts
import { InAIAuthClient } from "@inai-dev/backend";

const client = new InAIAuthClient({
  publishableKey: "pk_live_xxx",  // optional, required for /api/v1/ routes — auto-read from INAI_PUBLISHABLE_KEY env var
  tenantId: "tenant_xxx",         // optional
});
```

#### App User Auth Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `login` | `(params: LoginParams) => Promise<LoginResult>` | Authenticate with email/password. Returns tokens or MFA challenge. |
| `register` | `(params: { email, password, firstName?, lastName? }) => Promise<LoginResult & { user? }>` | Create a new user account. May return tokens or require email verification. |
| `mfaChallenge` | `(params: MFAChallengeParams) => Promise<TokenPair>` | Submit a TOTP code to complete MFA. Returns tokens on success. |
| `refresh` | `(refreshToken: string) => Promise<TokenPair>` | Exchange a refresh token for a new token pair. |
| `logout` | `(refreshToken: string) => Promise<void>` | Invalidate the refresh token server-side. |
| `getMe` | `(accessToken: string) => Promise<{ data: UserResource }>` | Fetch the current user's profile. |
| `setActiveOrganization` | `(accessToken, orgId \| null) => Promise<TokenPair>` | Switch the user's active organization. Returns new tokens with updated org claims. |
| `forgotPassword` | `(email: string) => Promise<{ message }>` | Request a password reset email. |
| `resetPassword` | `(token, password) => Promise<{ message }>` | Reset password using the token from the email link. |
| `verifyEmail` | `(token: string) => Promise<{ message }>` | Verify an email address using the token from the verification email. |

#### Platform Auth Methods

Used by admin panels for developer/operator authentication.

| Method | Signature | Description |
|--------|-----------|-------------|
| `platformLogin` | `(params: LoginParams) => Promise<LoginResult & { user? }>` | Platform user login. |
| `platformRefresh` | `(refreshToken: string) => Promise<TokenPair>` | Refresh platform tokens. |
| `platformLogout` | `(refreshToken: string) => Promise<void>` | Invalidate platform refresh token. |
| `platformMfaChallenge` | `(params: MFAChallengeParams) => Promise<TokenPair & { user? }>` | Complete platform MFA. |
| `platformGetMe` | `(accessToken: string) => Promise<{ data: PlatformUserResource }>` | Fetch platform user profile. |

#### Platform Management Methods

Used by admin panels to manage applications and users.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listApplications` | `(accessToken) => Promise<{ data: ApplicationResource[] }>` | List all applications for the tenant. |
| `createApplication` | `(accessToken, { name, slug, domain?, homeUrl? }) => Promise<{ data: ApplicationResource }>` | Create a new application. |
| `getApplication` | `(accessToken, appId) => Promise<{ data: ApplicationResource }>` | Get application details. |
| `updateApplication` | `(accessToken, appId, data) => Promise<{ data: ApplicationResource }>` | Update application settings. |
| `getApplicationStats` | `(accessToken, appId) => Promise<{ data: ApplicationStats }>` | Get user/session counts. |
| `listAppUsers` | `(accessToken, appId, { environmentId?, page?, limit? }) => Promise<PaginatedResult<UserResource>>` | List users for an app. |
| `createAppUser` | `(accessToken, appId, { email, password, firstName?, lastName?, environmentId }) => Promise<{ data: UserResource }>` | Create a user in an app. |
| `listAppApiKeys` | `(accessToken, appId, environmentId?) => Promise<{ data: ApiKeyResource[] }>` | List API keys. |
| `createAppApiKey` | `(accessToken, appId, name, environmentId) => Promise<{ data: ApiKeyResource & { key } }>` | Create an API key (full key returned only once). |
| `revokeAppApiKey` | `(accessToken, appId, keyId) => Promise<void>` | Revoke an API key. |
| `rotateAppKeys` | `(accessToken, appId, environmentId) => Promise<{ publishableKey }>` | Rotate environment publishable key. |

### InAIAuthError

Custom error class thrown by `InAIAuthClient` on non-2xx responses.

```ts
import { InAIAuthError } from "@inai-dev/backend";

try {
  await client.login({ email, password });
} catch (err) {
  if (err instanceof InAIAuthError) {
    console.log(err.status);    // HTTP status code (e.g., 401)
    console.log(err.code);      // Error code string (e.g., "INVALID_CREDENTIALS")
    console.log(err.body);      // { code, detail, field? }
    console.log(err.message);   // Human-readable message
  }
}
```

### Types

All types are exported from `@inai-dev/types` (and re-exported by `@inai-dev/backend`):

#### InAIAuthConfig

```ts
interface InAIAuthConfig {
  apiUrl?: string;         // default: https://apiauth.inai.dev
  publishableKey?: string; // auto-read from INAI_PUBLISHABLE_KEY env var
  tenantId?: string;
}
```

#### AuthObject

Returned by middleware `afterAuth` callback and client-side hooks. Represents the current user's auth state.

```ts
interface AuthObject {
  userId: string | null;
  tenantId: string | null;
  appId: string | null;
  envId: string | null;
  orgId: string | null;
  orgRole: string | null;
  sessionId: string | null;
  roles: string[];
  permissions: string[];
  getToken: () => Promise<string | null>;
  has: (params: { role?: string; permission?: string }) => boolean;
}
```

> **Note:** `has()` uses **OR logic** — it returns `true` if the user has the specified role **or** the specified permission. If you need to check for both a role AND a permission, call `has()` twice: `has({ role: "admin" }) && has({ permission: "write" })`.

#### ServerAuthObject

Extended `AuthObject` returned by `auth()` in server components. Adds `protect()` and `redirectToSignIn()`.

```ts
interface ServerAuthObject extends AuthObject {
  protect: (params?: {
    role?: string;
    permission?: string;
    redirectTo?: string;
  }) => ProtectedAuthObject;
  redirectToSignIn: (opts?: { returnTo?: string }) => never;
}
```

#### ProtectedAuthObject

Returned by `protect()`. Guarantees the user is authenticated (`userId` and `tenantId` are non-null).

```ts
interface ProtectedAuthObject {
  userId: string;         // guaranteed non-null
  tenantId: string;       // guaranteed non-null
  appId: string | null;
  envId: string | null;
  orgId: string | null;
  orgRole: string | null;
  sessionId: string | null;
  roles: string[];
  permissions: string[];
  isSignedIn: true;
  getToken: () => Promise<string>;
  has: (params: { role?: string; permission?: string }) => boolean;
}
```

#### UserResource

```ts
interface UserResource {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  externalId: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### PlatformUserResource

```ts
interface PlatformUserResource {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### SessionResource

```ts
interface SessionResource {
  id: string;
  userId: string;
  tenantId: string;
  environmentId: string | null;
  activeOrgId: string | null;
  expiresAt: string;
}
```

#### OrganizationResource

```ts
interface OrganizationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
```

#### ApplicationResource

```ts
interface ApplicationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  homeUrl: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  authConfig: Record<string, unknown> | null;
  environments: EnvironmentResource[];
  createdAt: string;
  updatedAt: string;
}
```

#### EnvironmentResource

```ts
interface EnvironmentResource {
  id: string;
  name: string;
  publishableKey: string;
  isActive: boolean;
}
```

#### ApplicationStats

```ts
interface ApplicationStats {
  totalUsers: number;
  activeSessions: number;
  totalRoles: number;
  totalApiKeys: number;
  environments: Array<{
    id: string;
    name: string;
    userCount: number;
    sessionCount: number;
  }>;
}
```

#### ApiKeyResource

```ts
interface ApiKeyResource {
  id: string;
  name: string;
  keyPrefix: string;
  keyType: string;
  environmentId: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}
```

#### JWTClaims

Structure of the JWT payload issued by the InAI Auth API.

```ts
interface JWTClaims {
  sub: string;                      // User ID
  type: "app_user" | "platform";    // Token type
  tenant_id: string;                // Tenant ID
  env_id?: string;                  // Environment ID (app_user only)
  app_id?: string;                  // Application ID (app_user only)
  email: string;
  roles: string[];
  permissions: string[];
  org_id?: string;                  // Active organization ID
  org_slug?: string;                // Active organization slug
  org_role?: string;                // User's role in the active org
  org_permissions?: string[];       // Org-scoped permissions
  external_id?: string;             // External system ID
  iat: number;                      // Issued at (Unix timestamp)
  exp: number;                      // Expires at (Unix timestamp)
}
```

#### Auth Flow Types

```ts
interface LoginParams {
  email: string;
  password: string;
}

interface LoginResult {
  mfa_required?: boolean;
  mfa_token?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface MFAChallengeParams {
  mfa_token: string;
  code: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface SignInResult {
  status: "complete" | "needs_mfa" | "error";
  mfa_token?: string;
  user?: UserResource;
  error?: string;
}

interface SignUpResult {
  status: "complete" | "needs_email_verification" | "error";
  user?: UserResource;
  error?: string;
}

interface InAIAuthErrorBody {
  code: string;
  detail: string;
  field?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## @inai-dev/nextjs (Client)

Import path: `@inai-dev/nextjs`

All exports from this path include the `"use client"` directive and can only be used in client components.

### Hooks

#### useAuth()

```ts
function useAuth(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  has: (params: { role?: string; permission?: string }) => boolean;
  signOut: () => Promise<void>;
}
```

Primary hook for auth state. `isLoaded` is `false` until the session cookie is parsed on mount.

#### useUser()

```ts
function useUser(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: UserResource | null;
}
```

Returns the full user object from the session cookie.

#### useSession()

```ts
function useSession(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  tenantId: string | null;
  orgId: string | null;
  orgRole: string | null;
}
```

Returns session metadata including organization context.

#### useOrganization()

```ts
function useOrganization(): {
  isLoaded: boolean;
  orgId: string | null;
  orgRole: string | null;
}
```

Returns the active organization context.

#### useSignIn()

```ts
function useSignIn(): {
  signIn: {
    create: (params: { identifier: string; password: string }) => Promise<SignInResult>;
    attemptMFA: (params: { code: string }) => Promise<SignInResult>;
  };
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "needs_mfa" | "complete" | "error";
  reset: () => void;
}
```

Manages the sign-in flow state machine. Call `signIn.create()` to start login. If MFA is required, `status` transitions to `"needs_mfa"` and you can call `signIn.attemptMFA()` with the TOTP code.

#### useSignUp()

```ts
function useSignUp(): {
  signUp: {
    create: (params: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<SignUpResult>;
  };
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "needs_email_verification" | "complete" | "error";
  reset: () => void;
}
```

Manages the registration flow. If email verification is required, `status` transitions to `"needs_email_verification"`.

### Components

#### InAIAuthProvider

```tsx
<InAIAuthProvider>
  {children}
</InAIAuthProvider>
```

Context provider. Reads the `auth_session` cookie on mount to hydrate auth state. Must wrap all components that use auth hooks.

#### SignIn

```tsx
<SignIn
  onMFARequired?: (mfaToken: string) => void
  onSuccess?: () => void
  redirectUrl?: string
/>
```

Pre-built login form with email/password fields and automatic MFA challenge handling.

#### UserButton

```tsx
<UserButton
  afterSignOutUrl?: string
  showName?: boolean
  menuItems?: Array<{ label: string; onClick: () => void }>
  appearance?: {
    buttonSize?: number;
    buttonBg?: string;
    menuBg?: string;
    menuBorder?: string;
  }
/>
```

Avatar button with dropdown menu. Shows user initials or avatar image. Includes sign-out by default. Supports keyboard navigation (Arrow keys, Escape, Tab).

#### SignedIn

```tsx
<SignedIn>{children}</SignedIn>
```

Renders children only when the user is authenticated and loaded.

#### SignedOut

```tsx
<SignedOut>{children}</SignedOut>
```

Renders children only when the user is not authenticated (and loaded).

#### Protect

```tsx
<Protect
  role?: string
  permission?: string
  fallback?: ReactNode
>
  {children}
</Protect>
```

Renders children only when the user is authenticated and has the required role or permission. Shows `fallback` otherwise.

#### PermissionGate

```tsx
<PermissionGate
  permission?: string
  role?: string
  fallback?: ReactNode
>
  {children}
</PermissionGate>
```

Similar to Protect but does not check sign-in status first -- only checks if the user has the given permission or role.

#### OrganizationSwitcher

```tsx
<OrganizationSwitcher />
```

Dropdown that fetches organizations from `/api/organizations` and calls `/api/auth/set-active-organization` to switch. Triggers a page reload after switching.

### Cookie Constants

```ts
const COOKIE_AUTH_TOKEN = "auth_token";
const COOKIE_REFRESH_TOKEN = "refresh_token";
const COOKIE_AUTH_SESSION = "auth_session";
```

---

## @inai-dev/nextjs/server

Import path: `@inai-dev/nextjs/server`

Server-only exports. Do not import in client components.

### auth()

```ts
async function auth(): Promise<ServerAuthObject>
```

Reads JWT claims from the `auth_token` httpOnly cookie. The JWT signature was already verified by the middleware using ES256 via JWKS. See [Architecture](./architecture.md) for the layered security model.

### currentUser()

```ts
async function currentUser(opts?: { fresh?: boolean }): Promise<UserResource | null>
```

- Without `{ fresh: true }`: reads user from the `auth_session` cookie (no network request)
- With `{ fresh: true }`: calls `client.getMe()` using the access token to get up-to-date data

### createAuthRoutes()

```ts
function createAuthRoutes(config: InAIAuthConfig): {
  GET: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
  POST: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
}
```

Creates a catch-all route handler for `/api/auth/[...inai]` that handles login, register, MFA challenge, refresh, and logout for app users.

### createPlatformAuthRoutes()

```ts
function createPlatformAuthRoutes(config: InAIAuthConfig): {
  GET: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
  POST: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
}
```

Same as `createAuthRoutes` but for platform user authentication. Uses `/api/platform/auth/*` API endpoints.

### configureAuth()

```ts
function configureAuth(config: InAIAuthSDKConfig): void
```

Override default SDK configuration:

```ts
interface InAIAuthSDKConfig {
  signInUrl?: string;       // default: "/login"
  signUpUrl?: string;       // default: "/register"
  afterSignInUrl?: string;  // default: "/"
  afterSignOutUrl?: string; // default: "/login"
  apiUrl?: string;          // default: https://apiauth.inai.dev
  publishableKey?: string;  // default: from INAI_PUBLISHABLE_KEY env var
}
```

### getAuthConfig()

```ts
function getAuthConfig(): Required<InAIAuthSDKConfig>
```

Returns the resolved configuration, merging user overrides with defaults and environment variables.

---

## @inai-dev/nextjs/middleware

Import path: `@inai-dev/nextjs/middleware`

### inaiAuthMiddleware()

```ts
function inaiAuthMiddleware(config?: InAIMiddlewareConfig): (req: NextRequest) => Promise<NextResponse>
```

```ts
interface InAIMiddlewareConfig {
  publicRoutes?: string[] | ((req: NextRequest) => boolean);
  signInUrl?: string;  // default: "/login"
  beforeAuth?: (req: NextRequest) => NextResponse | void;
  afterAuth?: (auth: AuthObject, req: NextRequest) => NextResponse | void;
}
```

### withInAIAuth()

```ts
function withInAIAuth(
  wrappedMiddleware: (req: NextRequest) => NextResponse | Response | Promise<NextResponse | Response>,
  config?: InAIMiddlewareConfig,
): (req: NextRequest) => Promise<NextResponse>
```

Wraps another middleware function. Auth is resolved first, then the auth object is serialized to the `x-inai-auth` request header, and the wrapped middleware is called.

### createRouteMatcher()

```ts
function createRouteMatcher(
  patterns: (string | RegExp)[],
): (req: NextRequest) => boolean
```

Creates a function that tests a request's pathname against a list of patterns. Supports exact strings, glob-style trailing `*`, inline regex groups like `(.*)`, and full `RegExp` objects.
