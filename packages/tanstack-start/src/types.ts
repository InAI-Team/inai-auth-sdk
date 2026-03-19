import type { AuthObject } from "@inai-dev/types";

/**
 * Configuration for the TanStack Start request-level auth middleware.
 *
 * @see {@link createInAIAuthMiddleware} for usage examples.
 */
export interface InAITanStackMiddlewareConfig {
  /** `"app"` (default) for end-user auth, `"platform"` for admin/platform auth. */
  authMode?: "app" | "platform";
  /**
   * Routes that bypass authentication. Accepts an array of glob-like strings
   * (e.g. `"/api/*"`, `"/login"`) or a predicate function `(pathname) => boolean`.
   */
  publicRoutes?: string[] | ((pathname: string) => boolean);
  /** URL to redirect unauthenticated users to. Defaults to `"/login"`. */
  signInUrl?: string;
  /**
   * Behavior when the user is not authenticated on a protected route:
   * - `"redirect"` (default): throws a redirect to `signInUrl`.
   * - `"null"`: passes `auth: null` into the middleware context (useful for API routes).
   */
  onUnauthorized?: "redirect" | "null";
  /** InAI Auth API URL. Defaults to `https://apiauth.inai.dev`. */
  apiUrl?: string;
  /** Custom JWKS endpoint URL. Defaults to `{apiUrl}/.well-known/jwks.json`. */
  jwksUrl?: string;
  /**
   * Optional callback invoked **before** the auth check runs.
   * If it returns a `Response`, that response is thrown as the final response
   * (TanStack Start treats thrown `Response` objects as the request result).
   * Useful for custom rate limiting, IP filtering, or early redirects.
   */
  beforeAuth?: (request: Request) => Response | void;
  /**
   * Optional callback invoked **after** the auth check succeeds on a protected route.
   * Receives the resolved `AuthObject` and the original `Request`.
   * If it returns a `Response`, that response is used instead of proceeding.
   * Useful for role-based route filtering at the request level.
   */
  afterAuth?: (auth: AuthObject, request: Request) => Response | void;
}

/**
 * Configuration for the `requireAuth` guard middleware.
 */
export interface RequireAuthConfig {
  /** Required role name. Throws if the user does not have this role. */
  role?: string;
  /** Required permission name. Throws if the user does not have this permission. */
  permission?: string;
}
