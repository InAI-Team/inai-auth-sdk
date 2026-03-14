# @inai-dev/types

TypeScript type definitions for the InAI Auth SDK. This package contains all shared interfaces and types used across the SDK.

## Installation

```bash
npm install @inai-dev/types
```

> **Note:** You typically don't need to install this directly. It's included as a dependency of all other `@inai-dev/*` packages.

## Auth Types

```ts
import type {
  AuthObject,            // Base auth object (userId, tenantId, orgId, has(), getToken())
  ServerAuthObject,      // Extends AuthObject with protect() and redirectToSignIn()
  ProtectedAuthObject,   // AuthObject with non-null userId (after protect())
  JWTClaims,             // Decoded JWT payload (sub, tenant_id, roles, permissions, ...)
} from "@inai-dev/types";
```

## Resource Types

```ts
import type {
  UserResource,          // App user (id, email, firstName, lastName, roles, ...)
  PlatformUserResource,  // Platform admin user
  SessionResource,       // User session (id, userId, tenantId, expiresAt)
  OrganizationResource,  // Organization (id, name, slug, metadata)
  ApplicationResource,   // Application (id, name, slug, environments)
  EnvironmentResource,   // Environment (id, name, publishableKey)
  ApplicationStats,      // App statistics (totalUsers, activeSessions, ...)
  ApiKeyResource,        // API key (id, name, keyPrefix, keyType)
  PaginatedResult,       // Paginated response wrapper (data, total, page, limit)
} from "@inai-dev/types";
```

## Config Types

```ts
import type {
  InAIAuthConfig,        // Client config (publishableKey, tenantId)
  InAIMiddlewareConfig,  // Middleware config (publicRoutes, signInUrl, beforeAuth, afterAuth)
  InAIAuthSDKConfig,     // SDK-wide config (signInUrl, signUpUrl, afterSignInUrl, publishableKey)
} from "@inai-dev/types";
```

## Result Types

```ts
import type {
  LoginParams,           // { email, password }
  LoginResult,           // { access_token?, mfa_required?, mfa_token? }
  MFAChallengeParams,    // { mfa_token, code }
  TokenPair,             // { access_token, refresh_token, token_type, expires_in }
  SignInResult,           // { status, mfa_token?, user?, error? }
  SignUpResult,           // { status, user?, error? }
  InAIAuthErrorBody,     // { code, detail, field? }
} from "@inai-dev/types";
```

## Exports Reference

| Type | Category | Description |
|---|---|---|
| `AuthObject` | Auth | Base authentication state |
| `ServerAuthObject` | Auth | Server-side auth with protect/redirect |
| `ProtectedAuthObject` | Auth | Guaranteed authenticated state |
| `JWTClaims` | Auth | Decoded JWT token claims |
| `UserResource` | Resource | App user data |
| `PlatformUserResource` | Resource | Platform admin data |
| `SessionResource` | Resource | Session data |
| `OrganizationResource` | Resource | Organization data |
| `ApplicationResource` | Resource | Application data |
| `EnvironmentResource` | Resource | Environment data |
| `ApplicationStats` | Resource | Application statistics |
| `ApiKeyResource` | Resource | API key data |
| `PaginatedResult<T>` | Resource | Paginated response |
| `InAIAuthConfig` | Config | Client configuration |
| `InAIMiddlewareConfig` | Config | Middleware configuration |
| `InAIAuthSDKConfig` | Config | SDK global configuration |
| `LoginParams` | Result | Login request parameters |
| `LoginResult` | Result | Login response |
| `MFAChallengeParams` | Result | MFA challenge parameters |
| `TokenPair` | Result | Token pair response |
| `SignInResult` | Result | Sign-in flow result |
| `SignUpResult` | Result | Sign-up flow result |
| `InAIAuthErrorBody` | Result | Error response body |

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
