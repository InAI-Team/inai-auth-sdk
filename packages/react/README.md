# @inai-dev/react

React hooks and components for InAI Auth. Provides authentication context, hooks for accessing user/session data, and pre-built UI components.

## Installation

```bash
npm install @inai-dev/react
```

## Provider

Wrap your app with `InAIAuthProvider`. It reads session data from the `auth_session` cookie (set by the server-side auth routes) — no props required.

```tsx
import { InAIAuthProvider } from "@inai-dev/react";

function App({ children }) {
  return (
    <InAIAuthProvider>{children}</InAIAuthProvider>
  );
}
```

## Hooks

### `useAuth()`

```ts
const { isLoaded, isSignedIn, userId, roles, permissions, has, signOut, refreshSession } = useAuth();

has({ role: "admin" });       // check role
has({ permission: "read" });  // check permission
await signOut();              // logout and redirect
await refreshSession();       // refresh tokens
```

### `useUser()`

```ts
const { isLoaded, isSignedIn, user } = useUser();
// user: UserResource | null (id, email, firstName, lastName, avatarUrl, roles, ...)
```

### `useSession()`

```ts
const { isLoaded, isSignedIn, userId, tenantId, orgId, orgRole, roles, permissions } = useSession();
```

### `useOrganization()`

```ts
const { isLoaded, orgId, orgRole } = useOrganization();
```

### `useSignIn()`

```ts
const { signIn, isLoading, error, status, reset } = useSignIn();

await signIn.create({ identifier: "user@example.com", password: "..." });
// status: "idle" | "loading" | "needs_mfa" | "complete" | "error"

// MFA flow
await signIn.attemptMFA({ code: "123456" });
```

### `useSignUp()`

```ts
const { signUp, isLoading, error, status, reset } = useSignUp();

await signUp.create({
  email: "user@example.com",
  password: "...",
  firstName: "Jane",
  lastName: "Doe",
});
// status: "idle" | "loading" | "needs_email_verification" | "complete" | "error"
```

## Components

### `<Protect>`

Renders children only if the user has the required role or permission.

```tsx
<Protect role="admin" fallback={<p>Access denied</p>}>
  <AdminPanel />
</Protect>

<Protect permission="posts:write">
  <Editor />
</Protect>
```

### `<SignedIn>` / `<SignedOut>`

Conditional rendering based on authentication state.

```tsx
<SignedIn>
  <p>Welcome back!</p>
</SignedIn>
<SignedOut>
  <p>Please sign in.</p>
</SignedOut>
```

### `<PermissionGate>`

Permission-based access control.

```tsx
<PermissionGate permission="billing:manage" fallback={<p>No access</p>}>
  <BillingSettings />
</PermissionGate>
```

### `<UserButton>`

User profile menu with avatar and dropdown.

```tsx
<UserButton
  afterSignOutUrl="/"
  showName
  menuItems={[{ label: "Settings", onClick: () => router.push("/settings") }]}
  appearance={{ buttonSize: 36, buttonBg: "#1a1a2e" }}
/>
```

### `<SignIn>`

Sign-in form with MFA support.

```tsx
<SignIn
  redirectUrl="/dashboard"
  onSuccess={() => console.log("Signed in!")}
  onMFARequired={(mfaToken) => router.push("/mfa")}
/>
```

### `<OrganizationSwitcher>`

Organization switching dropdown.

```tsx
<OrganizationSwitcher />
```

## Exports Reference

| Export | Kind | Description |
|---|---|---|
| `InAIAuthProvider` | Component | Auth context provider (no props) |
| `Protect` | Component | Role/permission gate |
| `SignedIn` | Component | Renders when signed in |
| `SignedOut` | Component | Renders when signed out |
| `PermissionGate` | Component | Permission-based gate |
| `UserButton` | Component | User profile menu |
| `SignIn` | Component | Sign-in form |
| `OrganizationSwitcher` | Component | Org switcher |
| `useAuth` | Hook | Auth state & actions |
| `useUser` | Hook | User data |
| `useSession` | Hook | Session info |
| `useOrganization` | Hook | Organization data |
| `useSignIn` | Hook | Sign-in flow |
| `useSignUp` | Hook | Sign-up flow |

## Questions & Support

Visit [https://inai.dev](https://inai.dev) for documentation, guides, and support.

## License

[MIT](../../LICENSE)
