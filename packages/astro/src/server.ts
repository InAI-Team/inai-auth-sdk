import type { AuthObject, UserResource } from "@inai-dev/types";
import { InAIAuthClient } from "@inai-dev/backend";
import {
  COOKIE_AUTH_TOKEN,
  getClaimsFromToken,
  isTokenExpired,
} from "@inai-dev/shared";

interface AstroContext {
  cookies: {
    get(name: string): { value: string } | undefined;
  };
  locals: Record<string, unknown>;
}

export function auth(context: AstroContext): AuthObject | null {
  const existing = (context.locals as Record<string, unknown>).auth as AuthObject | undefined;
  if (existing) return existing;

  const token = context.cookies.get(COOKIE_AUTH_TOKEN)?.value;
  if (!token || isTokenExpired(token)) return null;

  const claims = getClaimsFromToken(token);
  if (!claims) return null;

  const roles = claims.roles ?? [];
  const permissions = claims.permissions ?? [];

  return {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    appId: claims.app_id ?? null,
    envId: claims.env_id ?? null,
    orgId: claims.org_id ?? null,
    orgRole: claims.org_role ?? null,
    sessionId: null,
    getToken: async () => token,
    has: (params: { role?: string; permission?: string }) => {
      if (params.role && roles.includes(params.role)) return true;
      if (params.permission && permissions.includes(params.permission))
        return true;
      return false;
    },
  };
}

export async function currentUser(
  context: AstroContext,
  config: { apiUrl: string; publishableKey?: string },
): Promise<UserResource | null> {
  const token = context.cookies.get(COOKIE_AUTH_TOKEN)?.value;
  if (!token || isTokenExpired(token)) return null;

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
