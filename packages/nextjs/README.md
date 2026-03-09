# @inai-dev/nextjs

Full Next.js integration for InAI Auth. Includes middleware, server-side helpers, API route handlers, and re-exports all React hooks/components.

## Installation

```bash
npm install @inai-dev/nextjs
```

## Setup

### 1. Environment Variables

```env
NEXT_PUBLIC_INAI_PUBLISHABLE_KEY=pk_live_...
INAI_SECRET_KEY=sk_live_...
```

### 2. Middleware

```ts
// middleware.ts
import { authMiddleware } from "@inai-dev/nextjs/middleware";

export default authMiddleware({
  publishableKey: process.env.NEXT_PUBLIC_INAI_PUBLISHABLE_KEY!,
  publicRoutes: ["/", "/about", "/sign-in"],
});

export const config = { matcher: ["/((?!_next|static|favicon.ico).*)"] };
```

### 3. Provider

```tsx
// app/layout.tsx
import { InAIProvider } from "@inai-dev/nextjs";

export default function RootLayout({ children }) {
  return <InAIProvider>{children}</InAIProvider>;
}
```

### 4. Server-Side Auth

```ts
// app/dashboard/page.tsx
import { auth } from "@inai-dev/nextjs/server";

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect("/sign-in");
  return <p>Welcome {session.user.email}</p>;
}
```

### 5. API Route Handlers

```ts
// app/api/auth/[...inai]/route.ts
import { handleAuthRoutes } from "@inai-dev/nextjs";
export const { GET, POST } = handleAuthRoutes();
```

## Exports

- `@inai-dev/nextjs` — Provider, React hooks, API route handler
- `@inai-dev/nextjs/server` — `auth()`, `currentUser()`, server-side helpers
- `@inai-dev/nextjs/middleware` — `authMiddleware()`

## Documentation

- [Getting Started](https://github.com/inai-dev/sdk/blob/main/docs/getting-started.md)
- [Next.js Integration](https://github.com/inai-dev/sdk/blob/main/docs/nextjs-integration.md)
- [API Reference](https://github.com/inai-dev/sdk/blob/main/docs/api-reference.md)

## License

[MIT](../../LICENSE)
