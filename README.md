# InAI Auth SDK

Multi-tenant authentication SDK for JavaScript/TypeScript applications. Provides framework-specific integrations for Next.js and Astro, plus standalone React hooks and a universal backend client.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@inai-dev/types`](./packages/types) | TypeScript type definitions | ![npm](https://img.shields.io/npm/v/@inai-dev/types) |
| [`@inai-dev/shared`](./packages/shared) | Shared utilities (validators, errors, constants) | ![npm](https://img.shields.io/npm/v/@inai-dev/shared) |
| [`@inai-dev/backend`](./packages/backend) | Server-side auth client | ![npm](https://img.shields.io/npm/v/@inai-dev/backend) |
| [`@inai-dev/react`](./packages/react) | React hooks and providers | ![npm](https://img.shields.io/npm/v/@inai-dev/react) |
| [`@inai-dev/nextjs`](./packages/nextjs) | Next.js integration (middleware, server, API routes) | ![npm](https://img.shields.io/npm/v/@inai-dev/nextjs) |
| [`@inai-dev/astro`](./packages/astro) | Astro integration (middleware, server helpers) | ![npm](https://img.shields.io/npm/v/@inai-dev/astro) |

## Dependency Graph

```
@inai-dev/types
    └── @inai-dev/shared
          └── @inai-dev/backend
                ├── @inai-dev/react
                │     └── @inai-dev/nextjs
                └── @inai-dev/astro
```

## Quick Start

### Next.js

```bash
npm install @inai-dev/nextjs
```

```ts
// middleware.ts
import { inaiAuthMiddleware } from "@inai-dev/nextjs/middleware";
export default inaiAuthMiddleware({ publicRoutes: ["/", "/login"] });

// app/layout.tsx
import { InAIAuthProvider } from "@inai-dev/nextjs";
export default function Layout({ children }) {
  return <InAIAuthProvider>{children}</InAIAuthProvider>;
}

// app/page.tsx
import { auth, currentUser } from "@inai-dev/nextjs/server";
export default async function Page() {
  const { userId } = await auth();
  const user = await currentUser();
  return <p>Hello {user?.email}</p>;
}
```

### Astro

```bash
npm install @inai-dev/astro
```

```ts
// astro.config.mjs
import inaiAuth from "@inai-dev/astro";
export default defineConfig({
  integrations: [inaiAuth({ publishableKey: import.meta.env.INAI_KEY })],
});
```

## Development

```bash
# Install dependencies
npm install

# Build all packages (respects dependency order)
npm run build

# Type-check all packages
npm run typecheck

# Run tests
npm run test

# Clean build artifacts
npm run clean
```

## Versioning & Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# Create a changeset
npx changeset

# Version packages
npx changeset version

# Publish to npm
npm run release
```

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Installation](./docs/installation.md)
- [Next.js Integration](./docs/nextjs-integration.md)
- [Astro Integration](./docs/astro-integration.md)
- [Authentication Flows](./docs/authentication-flows.md)
- [Organizations & RBAC](./docs/organizations-rbac.md)
- [API Reference](./docs/api-reference.md)
- [Architecture](./docs/architecture.md)

## License

[MIT](./LICENSE)
