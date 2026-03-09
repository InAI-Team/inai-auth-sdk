# @inai-dev/astro

Astro integration for InAI Auth. Provides middleware, server-side helpers, and Astro components for authentication.

## Installation

```bash
npm install @inai-dev/astro
```

## Setup

### 1. Add Integration

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import inaiAuth from "@inai-dev/astro";

export default defineConfig({
  integrations: [
    inaiAuth({
      publishableKey: import.meta.env.INAI_PUBLISHABLE_KEY,
    }),
  ],
});
```

### 2. Use in Pages

```astro
---
// src/pages/dashboard.astro
const auth = Astro.locals.auth;
if (!auth?.userId) return Astro.redirect("/sign-in");
---
<p>Welcome {auth.user.email}</p>
```

### 3. API Endpoints

```ts
// src/pages/api/auth/[...path].ts
import { handleAuthRoutes } from "@inai-dev/astro/server";
export const ALL = handleAuthRoutes();
```

## Exports

- `@inai-dev/astro` — Astro integration function
- `@inai-dev/astro/middleware` — Auth middleware
- `@inai-dev/astro/server` — Server-side helpers and API route handlers

## Documentation

- [Astro Integration](https://github.com/inai-dev/sdk/blob/main/docs/astro-integration.md)
- [API Reference](https://github.com/inai-dev/sdk/blob/main/docs/api-reference.md)

## License

[MIT](../../LICENSE)
