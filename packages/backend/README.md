# @inai-dev/backend

Server-side client for the InAI Auth API. Use this package to interact with the auth API from any Node.js or edge runtime.

## Installation

```bash
npm install @inai-dev/backend
```

## Quick Start

```ts
import { InAIAuthClient } from "@inai-dev/backend";

const client = new InAIAuthClient({
  publishableKey: "pk_live_...",
});

// Login a user
const result = await client.login({ email: "user@example.com", password: "..." });

// Get current user
const { data: user } = await client.getMe(result.access_token);
```

## App User Auth (v1)

Methods for authenticating end-users of your application.

```ts
// Login
const result = await client.login({ email, password });
// result: { access_token, refresh_token, expires_in } or { mfa_required, mfa_token }

// Register
const result = await client.register({ email, password, firstName, lastName });

// MFA Challenge
const tokens = await client.mfaChallenge({ mfa_token, code });

// Refresh tokens
const tokens = await client.refresh(refreshToken);

// Logout
await client.logout(refreshToken);

// Get current user
const { data: user } = await client.getMe(accessToken);

// Set active organization
const tokens = await client.setActiveOrganization(accessToken, orgId);

// Forgot password
await client.forgotPassword(email);

// Reset password
await client.resetPassword(token, newPassword);

// Verify email
await client.verifyEmail(token);
```

## Platform Auth

Methods for authenticating platform administrators.

```ts
const result = await client.platformLogin({ email, password });
const tokens = await client.platformRefresh(refreshToken);
await client.platformLogout(refreshToken);
const tokens = await client.platformMfaChallenge({ mfa_token, code });
const { data: user } = await client.platformGetMe(accessToken);
```

## Platform Management

Methods for managing applications, users, and API keys (requires platform access token).

```ts
// Applications
const { data: apps } = await client.listApplications(accessToken);
const { data: app } = await client.createApplication(accessToken, { name, slug });
const { data: app } = await client.getApplication(accessToken, appId);
const { data: app } = await client.updateApplication(accessToken, appId, { name });
const { data: stats } = await client.getApplicationStats(accessToken, appId);

// App Users
const { data, total, page, limit } = await client.listAppUsers(accessToken, appId, { environmentId, page, limit });
const { data: user } = await client.createAppUser(accessToken, appId, { email, password, environmentId });

// API Keys
const { data: keys } = await client.listAppApiKeys(accessToken, appId, environmentId);
const { data: key } = await client.createAppApiKey(accessToken, appId, name, environmentId);
await client.revokeAppApiKey(accessToken, appId, keyId);

// Rotate publishable keys
const { publishableKey } = await client.rotateAppKeys(accessToken, appId, environmentId);
```

## API Reference

| Method | Description |
|---|---|
| `login(params)` | App user login |
| `register(params)` | App user registration |
| `mfaChallenge(params)` | MFA code verification |
| `refresh(refreshToken)` | Refresh access token |
| `logout(refreshToken)` | Revoke refresh token |
| `getMe(accessToken)` | Get current app user |
| `setActiveOrganization(accessToken, orgId)` | Switch active org |
| `forgotPassword(email)` | Send password reset email |
| `resetPassword(token, password)` | Reset password with token |
| `verifyEmail(token)` | Verify email address |
| `platformLogin(params)` | Platform admin login |
| `platformRefresh(refreshToken)` | Platform token refresh |
| `platformLogout(refreshToken)` | Platform logout |
| `platformMfaChallenge(params)` | Platform MFA verification |
| `platformGetMe(accessToken)` | Get current platform user |
| `listApplications(accessToken)` | List all applications |
| `createApplication(accessToken, data)` | Create application |
| `getApplication(accessToken, appId)` | Get application details |
| `updateApplication(accessToken, appId, data)` | Update application |
| `getApplicationStats(accessToken, appId)` | Get application stats |
| `listAppUsers(accessToken, appId, params?)` | List app users |
| `createAppUser(accessToken, appId, data)` | Create app user |
| `listAppApiKeys(accessToken, appId, envId?)` | List API keys |
| `createAppApiKey(accessToken, appId, name, envId)` | Create API key |
| `revokeAppApiKey(accessToken, appId, keyId)` | Revoke API key |
| `rotateAppKeys(accessToken, appId, envId)` | Rotate publishable keys |

## Token Verification (ES256)

Token verification is now async and uses ES256 cryptographic verification via JWKS:

```ts
import { buildAuthObjectFromToken } from "@inai-dev/backend";
import { JWKSClient } from "@inai-dev/shared";

const jwks = new JWKSClient("https://apiauth.inai.dev/.well-known/jwks.json");
const auth = await buildAuthObjectFromToken(token, jwks);
// auth: AuthObject | null
```

> All tokens are cryptographically verified using ES256 (ECDSA P-256). Public keys are fetched from the JWKS endpoint and cached for 5 minutes. On signature failure, the client automatically retries with fresh keys to handle key rotation.

## Error Handling

```ts
import { InAIAuthError } from "@inai-dev/shared";

try {
  await client.login({ email, password });
} catch (err) {
  if (err instanceof InAIAuthError) {
    console.error(err.status, err.message, err.body);
  }
}
```

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
