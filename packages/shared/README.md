# @inai-dev/shared

Shared utilities for the InAI Auth SDK. Includes error class, JWT helpers, validators, URL utilities, and constants.

## Installation

```bash
npm install @inai-dev/shared
```

> **Note:** You typically don't need to install this directly. It's included as a dependency of higher-level packages.

## Exports

### Error Class

```ts
import { InAIAuthError } from "@inai-dev/shared";

try {
  // ...
} catch (err) {
  if (err instanceof InAIAuthError) {
    console.error(err.status, err.message, err.body);
  }
}
```

### JWT Utilities

```ts
import { decodeJWTPayload, isTokenExpired, getClaimsFromToken } from "@inai-dev/shared";

const payload = decodeJWTPayload(token);   // Raw JWT payload or null
const expired = isTokenExpired(token);      // boolean
const claims = getClaimsFromToken(token);   // JWTClaims or null
```

### JWT Verification (ES256)

```ts
import { JWKSClient, decodeJWTHeader, verifyES256 } from "@inai-dev/shared";

const jwks = new JWKSClient("https://apiauth.inai.dev/.well-known/jwks.json");
const header = decodeJWTHeader(token);
const publicKey = await jwks.getKey(header.kid);
const claims = await verifyES256(token, publicKey);
```

The `JWKSClient` fetches and caches public keys from the JWKS endpoint (default TTL: 5 minutes) with built-in rate limiting to prevent refetch abuse.

### Validators

```ts
import { isValidEmail, isStrongPassword } from "@inai-dev/shared";

isValidEmail("user@example.com");  // true
isStrongPassword("MyP@ss1234");    // true
```

### Constants

```ts
import {
  COOKIE_AUTH_TOKEN,       // "auth_token"
  COOKIE_REFRESH_TOKEN,    // "refresh_token"
  COOKIE_AUTH_SESSION,     // "auth_session"
  DEFAULT_SIGN_IN_URL,     // "/login"
  DEFAULT_SIGN_UP_URL,     // "/register"
  DEFAULT_AFTER_SIGN_IN_URL,  // "/"
  DEFAULT_AFTER_SIGN_OUT_URL, // "/login"
  HEADER_PUBLISHABLE_KEY,  // "X-Publishable-Key"
  HEADER_AUTHORIZATION,    // "Authorization"
  HEADER_INAI_AUTH,        // "x-inai-auth"
  DEFAULT_API_URL,         // Internal — not for public use
} from "@inai-dev/shared";
```

### URL Utilities

```ts
import { normalizeApiUrl, buildEndpoint } from "@inai-dev/shared";
```

## Exports Reference

| Export | Kind | Description |
|---|---|---|
| `InAIAuthError` | Class | Auth error with status and body |
| `decodeJWTPayload` | Function | Decode JWT payload (no verification) |
| `isTokenExpired` | Function | Check if JWT is expired |
| `getClaimsFromToken` | Function | Extract typed JWTClaims from token |
| `isValidEmail` | Function | Email format validation |
| `isStrongPassword` | Function | Password strength validation |
| `normalizeApiUrl` | Function | Normalize API URL (trailing slash) |
| `buildEndpoint` | Function | Build full API endpoint URL |
| `COOKIE_AUTH_TOKEN` | Constant | Auth token cookie name |
| `COOKIE_REFRESH_TOKEN` | Constant | Refresh token cookie name |
| `COOKIE_AUTH_SESSION` | Constant | Session cookie name |
| `DEFAULT_API_URL` | Constant | Default API URL (internal) |
| `HEADER_PUBLISHABLE_KEY` | Constant | Publishable key header name |
| `DEFAULT_JWKS_URL` | Constant | Default JWKS endpoint URL |
| `JWKSClient` | Class | Client for fetching and caching JWKS public keys |
| `decodeJWTHeader` | Function | Decode JWT header to extract `alg` and `kid` |
| `verifyES256` | Function | Verify ES256 (ECDSA P-256) JWT signature |
| `importJWKPublicKey` | Function | Import JWK public key for ES256 verification |

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
