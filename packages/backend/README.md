# @inai-dev/backend

Server-side client for the InAI Auth API. Use this package to interact with the auth API from any Node.js or edge runtime.

## Installation

```bash
npm install @inai-dev/backend
```

## Usage

```ts
import { createInAIClient } from "@inai-dev/backend";

const client = createInAIClient({
  secretKey: process.env.INAI_SECRET_KEY!,
  publishableKey: process.env.INAI_PUBLISHABLE_KEY!,
});

// Get a user
const user = await client.users.get(userId);

// List sessions
const sessions = await client.sessions.list({ userId });

// Verify a token
const payload = await client.tokens.verify(token);
```

## API

- `createInAIClient(config)` — Creates an authenticated API client
- `client.users` — User CRUD operations
- `client.sessions` — Session management
- `client.tokens` — Token verification and rotation
- `client.organizations` — Organization management

## Documentation

See the full [API Reference](https://github.com/inai-dev/sdk/blob/main/docs/api-reference.md).

## License

[MIT](../../LICENSE)
