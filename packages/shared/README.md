# @inai-dev/shared

Shared utilities for the InAI Auth SDK. Includes validators, error classes, JWT helpers, URL utilities, and constants.

## Installation

```bash
npm install @inai-dev/shared
```

> **Note:** You typically don't need to install this directly. It's included as a dependency of higher-level packages.

## Usage

```ts
import { InAIError, isInAIError } from "@inai-dev/shared";
import { validateEmail, validatePassword } from "@inai-dev/shared";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@inai-dev/shared";
```

## Exports

- **Errors**: `InAIError`, `isInAIError`, error codes
- **Validators**: Email, password, and input validation
- **JWT**: Token decode and verification utilities
- **URL**: API URL builder helpers
- **Constants**: Cookie names, header names, default values

## Documentation

See the full [API Reference](https://github.com/inai-dev/sdk/blob/main/docs/api-reference.md).

## License

[MIT](../../LICENSE)
