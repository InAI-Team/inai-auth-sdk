# @inai-dev/types

TypeScript type definitions for the InAI Auth SDK. This package contains all shared interfaces and types used across the SDK.

## Installation

```bash
npm install @inai-dev/types
```

> **Note:** You typically don't need to install this directly. It's included as a dependency of all other `@inai-dev/*` packages.

## Usage

```ts
import type {
  AuthObject,
  UserResource,
  SessionResource,
  ApplicationResource,
  EnvironmentResource,
  OrganizationResource,
} from "@inai-dev/types";
```

## Exported Types

- **Auth**: `AuthObject`, `AuthConfig`, `SignInResult`, `SignUpResult`
- **Resources**: `UserResource`, `SessionResource`, `ApplicationResource`, `EnvironmentResource`, `OrganizationResource`, `RoleResource`, `PermissionResource`
- **Config**: `InAIConfig`, `CookieConfig`

## Documentation

See the full [API Reference](https://github.com/inai-dev/sdk/blob/main/docs/api-reference.md).

## License

[MIT](../../LICENSE)
