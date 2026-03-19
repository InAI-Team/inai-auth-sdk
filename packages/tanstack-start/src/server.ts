import { redirect } from "@tanstack/react-router";
import type {
  ServerAuthObject,
  ProtectedAuthObject,
  UserResource,
  PlatformUserResource,
} from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import { isTokenExpired, getClaimsFromToken } from "@inai-dev/shared";
import {
  getAuthTokenFromCookies,
  getSessionFromCookies,
} from "./cookies";
import { getAuthConfig } from "./config";

export { createAuthRouteHandlers } from "./api-routes";
export { createPlatformAuthRouteHandlers } from "./platform-api-routes";
export { configureAuth, getAuthConfig } from "./config";
export {
  setAuthCookies,
  clearAuthCookies,
  isSessionExpired,
  getRefreshTokenFromCookies,
  getAuthTokenFromCookies,
} from "./cookies";

/**
 * Returns the current auth state as a `ServerAuthObject`.
 *
 * This is a **synchronous** function (unlike Next.js's async `auth()`),
 * because TanStack Start's `getCookie` is synchronous.
 *
 * Must be called within a server context (server function, middleware, or route handler).
 *
 * @returns A `ServerAuthObject` with `userId`, `roles`, `permissions`, `protect()`, and `redirectToSignIn()`.
 *          If the user is not authenticated, `userId` will be `null`.
 *
 * @example
 * ```ts
 * import { createServerFn } from "@tanstack/react-start"
 * import { auth } from "@inai-dev/tanstack-start/server"
 *
 * const getProtectedData = createServerFn({ method: "GET" }).handler(() => {
 *   const session = auth()
 *   session.protect() // redirects to signIn if not authenticated
 *   return fetchData(session.userId)
 * })
 * ```
 */
export function auth(): ServerAuthObject {
  const token = getAuthTokenFromCookies();
  const config = getAuthConfig();

  function redirectToSignIn(opts?: { returnTo?: string }): never {
    const returnTo = opts?.returnTo;
    const url = returnTo
      ? `${config.signInUrl}?returnTo=${encodeURIComponent(returnTo)}`
      : config.signInUrl;
    throw redirect({ href: url });
  }

  if (!token || isTokenExpired(token)) {
    return {
      userId: null,
      tenantId: null,
      appId: null,
      envId: null,
      orgId: null,
      orgRole: null,
      sessionId: null,
      roles: [],
      permissions: [],
      getToken: async () => null,
      has: () => false,
      protect: () => {
        redirectToSignIn();
      },
      redirectToSignIn,
    };
  }

  const claims = getClaimsFromToken(token);
  if (!claims) {
    return {
      userId: null,
      tenantId: null,
      appId: null,
      envId: null,
      orgId: null,
      orgRole: null,
      sessionId: null,
      roles: [],
      permissions: [],
      getToken: async () => null,
      has: () => false,
      protect: () => {
        redirectToSignIn();
      },
      redirectToSignIn,
    };
  }

  const roles = claims.roles ?? [];
  const permissions = claims.permissions ?? [];

  const has = (params: { role?: string; permission?: string }) => {
    if (params.role && roles.includes(params.role)) return true;
    if (params.permission && permissions.includes(params.permission))
      return true;
    return false;
  };

  const protectedObj: ProtectedAuthObject = {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    appId: claims.app_id ?? null,
    envId: claims.env_id ?? null,
    orgId: claims.org_id ?? null,
    orgRole: claims.org_role ?? null,
    sessionId: null,
    roles,
    permissions,
    isSignedIn: true,
    getToken: async () => token,
    has,
  };

  return {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    appId: claims.app_id ?? null,
    envId: claims.env_id ?? null,
    orgId: claims.org_id ?? null,
    orgRole: claims.org_role ?? null,
    sessionId: null,
    roles,
    permissions,
    getToken: async () => token,
    has,
    protect: (params?: {
      role?: string;
      permission?: string;
      redirectTo?: string;
    }) => {
      if (params?.role || params?.permission) {
        if (!has({ role: params.role, permission: params.permission })) {
          throw redirect({ href: params.redirectTo ?? "/unauthorized" });
        }
      }
      return protectedObj;
    },
    redirectToSignIn,
  };
}

/**
 * Returns the current user resource from the session cookie or the API.
 *
 * @param opts - Optional. Set `fresh: true` to fetch from the API instead of the cookie cache.
 * @returns The user resource, or `null` if not authenticated.
 *
 * @example
 * ```ts
 * import { createServerFn } from "@tanstack/react-start"
 * import { currentUser } from "@inai-dev/tanstack-start/server"
 *
 * const getUser = createServerFn({ method: "GET" }).handler(async () => {
 *   const user = await currentUser({ fresh: true })
 *   if (!user) throw new Error("Not authenticated")
 *   return user
 * })
 * ```
 */
export async function currentUser(
  opts?: { fresh?: boolean },
): Promise<UserResource | PlatformUserResource | null> {
  if (opts?.fresh) {
    const token = getAuthTokenFromCookies();
    if (!token || isTokenExpired(token)) return null;

    const config = getAuthConfig();
    if (!config.apiUrl || !config.publishableKey) {
      const session = getSessionFromCookies();
      return session?.user ?? null;
    }

    const client = new InAIAuthClient({
      apiUrl: config.apiUrl,
      publishableKey: config.publishableKey,
    });
    try {
      const { data } = await client.getMe(token);
      return data;
    } catch {
      return null;
    }
  }

  const session = getSessionFromCookies();
  return session?.user ?? null;
}
