import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AuthObject,
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

export { createAuthRoutes } from "./api-routes";
export { createPlatformAuthRoutes } from "./platform-api-routes";
export { configureAuth, getAuthConfig } from "./config";
export { setAuthCookies, clearAuthCookies, getRefreshTokenFromCookies, getAuthTokenFromCookies } from "./cookies";

export async function auth(): Promise<ServerAuthObject> {
  const cookieStore = await cookies();
  const token = getAuthTokenFromCookies(cookieStore);
  const config = getAuthConfig();

  function redirectToSignIn(opts?: { returnTo?: string }): never {
    const returnTo = opts?.returnTo;
    const url = returnTo
      ? `${config.signInUrl}?returnTo=${encodeURIComponent(returnTo)}`
      : config.signInUrl;
    redirect(url);
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
          redirect(params.redirectTo ?? "/unauthorized");
        }
      }
      return protectedObj;
    },
    redirectToSignIn,
  };
}

export async function currentUser(
  opts?: { fresh?: boolean },
): Promise<UserResource | PlatformUserResource | null> {
  const cookieStore = await cookies();

  if (opts?.fresh) {
    const token = getAuthTokenFromCookies(cookieStore);
    if (!token || isTokenExpired(token)) return null;

    const config = getAuthConfig();
    if (!config.apiUrl || !config.publishableKey) {
      const session = getSessionFromCookies(cookieStore);
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

  const session = getSessionFromCookies(cookieStore);
  return session?.user ?? null;
}
