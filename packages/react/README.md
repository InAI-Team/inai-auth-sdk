# @inai-dev/react

React hooks and components for InAI Auth. Provides authentication context, hooks for accessing user/session data, and pre-built UI components.

## Installation

```bash
npm install @inai-dev/react react
```

## Usage

### Provider

```tsx
import { InAIProvider } from "@inai-dev/react";

function App() {
  return (
    <InAIProvider publishableKey={process.env.NEXT_PUBLIC_INAI_KEY!}>
      {children}
    </InAIProvider>
  );
}
```

### Hooks

```tsx
import { useAuth, useUser, useSession } from "@inai-dev/react";

function Profile() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { session } = useSession();

  if (!isSignedIn) return <p>Not signed in</p>;
  return <p>Hello {user.email}</p>;
}
```

## Exports

- **Provider**: `InAIProvider`
- **Hooks**: `useAuth`, `useUser`, `useSession`, `useOrganization`
- **Components**: `SignedIn`, `SignedOut`, `Protect`

## Documentation

See the full [API Reference](https://github.com/inai-dev/sdk/blob/main/docs/api-reference.md).

## License

[MIT](../../LICENSE)
