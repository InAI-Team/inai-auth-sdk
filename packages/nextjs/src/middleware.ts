import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuthObject } from "@inai-dev/types";
import {
  COOKIE_AUTH_TOKEN,
  COOKIE_AUTH_SESSION,
  COOKIE_REFRESH_TOKEN,
  DEFAULT_API_URL,
  getClaimsFromToken,
  isTokenExpired,
} from "@inai-dev/shared";

export interface InAIMiddlewareConfig {
  apiUrl?: string;
  publicRoutes?: string[] | ((req: NextRequest) => boolean);
  signInUrl?: string;
  beforeAuth?: (req: NextRequest) => NextResponse | void;
  afterAuth?: (auth: AuthObject, req: NextRequest) => NextResponse | void;
}

export function createRouteMatcher(
  patterns: (string | RegExp)[],
): (req: NextRequest) => boolean {
  const matchers = patterns.map((pattern) => {
    if (pattern instanceof RegExp) return pattern;
    let regexStr = pattern;
    if (regexStr.endsWith("*") && !regexStr.includes("(")) {
      regexStr = regexStr.slice(0, -1) + ".*";
    }
    return new RegExp(`^${regexStr}$`);
  });

  return (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    return matchers.some((m) => m.test(pathname));
  };
}

function matchesRoute(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern;
  });
}

function isPublicRoute(
  req: NextRequest,
  publicRoutes: string[] | ((req: NextRequest) => boolean),
  builtinPublic: string[],
): boolean {
  const pathname = req.nextUrl.pathname;
  if (matchesRoute(pathname, builtinPublic)) return true;
  if (typeof publicRoutes === "function") return publicRoutes(req);
  return matchesRoute(pathname, publicRoutes);
}

function buildAuthObject(
  token: string,
  claims: NonNullable<ReturnType<typeof getClaimsFromToken>>,
): AuthObject {
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

async function runAuthCheck(
  req: NextRequest,
  signInUrl: string,
  apiUrl?: string,
): Promise<{ authObj: AuthObject | null; response?: NextResponse }> {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_AUTH_TOKEN)?.value;

  if (!token || isTokenExpired(token)) {
    const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    if (refreshToken) {
      try {
        if (apiUrl) {
          const refreshRes = await fetch(`${apiUrl}/api/platform/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (refreshRes.ok) {
            const newTokens = await refreshRes.json() as {
              access_token: string;
              refresh_token: string;
              expires_in: number;
            };
            const meRes = await fetch(`${apiUrl}/api/platform/auth/me`, {
              headers: { Authorization: `Bearer ${newTokens.access_token}` },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              const newUser = meData.data ?? meData;
              const isProduction = process.env.NODE_ENV === "production";
              const response = NextResponse.next();
              response.cookies.set(COOKIE_AUTH_TOKEN, newTokens.access_token, {
                httpOnly: true, secure: isProduction, sameSite: "lax",
                path: "/", maxAge: newTokens.expires_in,
              });
              response.cookies.set(COOKIE_REFRESH_TOKEN, newTokens.refresh_token, {
                httpOnly: true, secure: isProduction, sameSite: "strict",
                path: "/api/auth", maxAge: 7 * 24 * 60 * 60,
              });
              response.cookies.set(COOKIE_AUTH_SESSION, JSON.stringify({
                user: newUser,
                expiresAt: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
              }), {
                httpOnly: false, secure: isProduction, sameSite: "lax",
                path: "/", maxAge: newTokens.expires_in,
              });
              return { authObj: null, response };
            }
          }
        } else {
          const refreshUrl = new URL("/api/auth/refresh", req.url);
          const refreshRes = await fetch(refreshUrl.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie") ?? "",
            },
          });
          if (refreshRes.ok) {
            const response = NextResponse.next();
            const setCookies = refreshRes.headers.getSetCookie?.() ?? [];
            for (const cookie of setCookies) {
              response.headers.append("Set-Cookie", cookie);
            }
            return { authObj: null, response };
          }
        }
      } catch {
        // Refresh failed, fall through to redirect
      }
    }

    const response = NextResponse.redirect(
      new URL(
        `${signInUrl}?returnTo=${encodeURIComponent(pathname)}`,
        req.url,
      ),
    );
    response.cookies.set(COOKIE_AUTH_TOKEN, "", { path: "/", maxAge: 0 });
    response.cookies.set(COOKIE_REFRESH_TOKEN, "", {
      path: "/api/auth",
      maxAge: 0,
    });
    response.cookies.set(COOKIE_AUTH_SESSION, "", { path: "/", maxAge: 0 });
    return { authObj: null, response };
  }

  const claims = getClaimsFromToken(token);
  if (!claims) {
    return {
      authObj: null,
      response: NextResponse.redirect(new URL(signInUrl, req.url)),
    };
  }

  return { authObj: buildAuthObject(token, claims) };
}

export function inaiAuthMiddleware(config: InAIMiddlewareConfig = {}) {
  const {
    apiUrl = DEFAULT_API_URL,
    publicRoutes = [],
    signInUrl = "/login",
    beforeAuth,
    afterAuth,
  } = config;

  const builtinPublic = ["/_next/*", "/favicon.ico", "/api/*", signInUrl];

  return async function middleware(
    req: NextRequest,
  ): Promise<NextResponse> {
    if (beforeAuth) {
      const result = beforeAuth(req);
      if (result) return result;
    }

    if (isPublicRoute(req, publicRoutes, builtinPublic)) {
      return NextResponse.next();
    }

    const { authObj, response } = await runAuthCheck(req, signInUrl, apiUrl);
    if (response) return response;
    if (!authObj)
      return NextResponse.redirect(new URL(signInUrl, req.url));

    if (afterAuth) {
      const result = afterAuth(authObj, req);
      if (result) return result;
    }

    return NextResponse.next();
  };
}

export function withInAIAuth(
  wrappedMiddleware: (
    req: NextRequest,
  ) => NextResponse | Response | Promise<NextResponse | Response>,
  config: InAIMiddlewareConfig = {},
): (req: NextRequest) => Promise<NextResponse> {
  const {
    apiUrl = DEFAULT_API_URL,
    publicRoutes = [],
    signInUrl = "/login",
    beforeAuth,
    afterAuth,
  } = config;

  const builtinPublic = ["/_next/*", "/favicon.ico", "/api/*", signInUrl];

  return async function middleware(
    req: NextRequest,
  ): Promise<NextResponse> {
    if (beforeAuth) {
      const result = beforeAuth(req);
      if (result) return result;
    }

    const isPublic = isPublicRoute(req, publicRoutes, builtinPublic);

    if (!isPublic) {
      const { authObj, response } = await runAuthCheck(req, signInUrl, apiUrl);
      if (response) return response;
      if (!authObj)
        return NextResponse.redirect(new URL(signInUrl, req.url));

      if (afterAuth) {
        const result = afterAuth(authObj, req);
        if (result) return result;
      }

      const authHeader = JSON.stringify({
        userId: authObj.userId,
        tenantId: authObj.tenantId,
        appId: authObj.appId,
        envId: authObj.envId,
        orgId: authObj.orgId,
        orgRole: authObj.orgRole,
      });
      req.headers.set("x-inai-auth", authHeader);
    }

    const wrappedResponse = await wrappedMiddleware(req);
    if (wrappedResponse instanceof NextResponse) return wrappedResponse;
    return new NextResponse(wrappedResponse.body, wrappedResponse);
  };
}
