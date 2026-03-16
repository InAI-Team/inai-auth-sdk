import { describe, it, expect, vi } from "vitest";
import {
  setAuthCookies,
  clearAuthCookies,
  getAuthTokenFromCookies,
  getRefreshTokenFromCookies,
  getSessionFromCookies,
} from "../cookies";
import type { TokenPair, UserResource } from "@inai-dev/types";

function makeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

function createMockCookieStore() {
  const store = new Map<string, { value: string; options?: Record<string, unknown> }>();
  return {
    get(name: string) {
      return store.get(name);
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      store.set(name, { value, ...options });
    },
    _store: store,
  };
}

const mockUser: UserResource = {
  id: "u_1",
  tenantId: "t_1",
  email: "user@test.com",
  firstName: "Test",
  lastName: "User",
  avatarUrl: null,
  isActive: true,
  emailVerified: true,
  mfaEnabled: false,
  externalId: null,
  roles: ["user"],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("setAuthCookies", () => {
  it("sets auth_token with expires_in as maxAge", () => {
    const cookieStore = createMockCookieStore();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJWT({ sub: "u_1", tenant_id: "t_1", exp, permissions: [], roles: [] });
    const tokens: TokenPair = {
      access_token: token,
      refresh_token: "rt_123",
      token_type: "Bearer",
      expires_in: 3600,
    };

    setAuthCookies(cookieStore as any, tokens, mockUser);

    const authToken = cookieStore._store.get("auth_token");
    expect(authToken).toBeDefined();
    expect(authToken!.value).toBe(token);

    // maxAge should be expires_in (3600), NOT 7 days
    const refreshToken = cookieStore._store.get("refresh_token");
    expect(refreshToken).toBeDefined();
  });

  it("sets refresh_token with 7 day maxAge", () => {
    const cookieStore = createMockCookieStore();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJWT({ sub: "u_1", tenant_id: "t_1", exp, permissions: [], roles: [] });
    const tokens: TokenPair = {
      access_token: token,
      refresh_token: "rt_123",
      token_type: "Bearer",
      expires_in: 3600,
    };

    setAuthCookies(cookieStore as any, tokens, mockUser);

    const refreshToken = cookieStore._store.get("refresh_token");
    expect(refreshToken).toBeDefined();
  });

  it("sets auth_session cookie with user and claims data", () => {
    const cookieStore = createMockCookieStore();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJWT({
      sub: "u_1",
      tenant_id: "t_1",
      exp,
      permissions: ["read"],
      org_id: "org_1",
      org_role: "member",
      roles: [],
    });
    const tokens: TokenPair = {
      access_token: token,
      refresh_token: "rt_123",
      token_type: "Bearer",
      expires_in: 3600,
    };

    setAuthCookies(cookieStore as any, tokens, mockUser);

    const session = cookieStore._store.get("auth_session");
    expect(session).toBeDefined();
    const parsed = JSON.parse(session!.value);
    expect(parsed.user.id).toBe("u_1");
    expect(parsed.permissions).toEqual(["read"]);
    expect(parsed.orgId).toBe("org_1");
    expect(parsed.orgRole).toBe("member");
  });
});

describe("clearAuthCookies", () => {
  it("clears all auth cookies", () => {
    const cookieStore = createMockCookieStore();
    cookieStore.set("auth_token", "token");
    cookieStore.set("refresh_token", "refresh");
    cookieStore.set("auth_session", "session");

    clearAuthCookies(cookieStore as any);

    expect(cookieStore._store.get("auth_token")!.value).toBe("");
    expect(cookieStore._store.get("refresh_token")!.value).toBe("");
    expect(cookieStore._store.get("auth_session")!.value).toBe("");
  });
});

describe("getAuthTokenFromCookies", () => {
  it("returns token value when present", () => {
    const cookieStore = createMockCookieStore();
    cookieStore.set("auth_token", "my-token");
    expect(getAuthTokenFromCookies(cookieStore as any)).toBe("my-token");
  });

  it("returns null when not present", () => {
    const cookieStore = createMockCookieStore();
    expect(getAuthTokenFromCookies(cookieStore as any)).toBeNull();
  });
});

describe("getRefreshTokenFromCookies", () => {
  it("returns refresh token when present", () => {
    const cookieStore = createMockCookieStore();
    cookieStore.set("refresh_token", "my-refresh");
    expect(getRefreshTokenFromCookies(cookieStore as any)).toBe("my-refresh");
  });

  it("returns null when not present", () => {
    const cookieStore = createMockCookieStore();
    expect(getRefreshTokenFromCookies(cookieStore as any)).toBeNull();
  });
});

describe("getSessionFromCookies", () => {
  it("parses session data from cookie", () => {
    const cookieStore = createMockCookieStore();
    const sessionData = { user: mockUser, expiresAt: 1735603200000 };
    cookieStore.set("auth_session", JSON.stringify(sessionData));

    const result = getSessionFromCookies(cookieStore as any);
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe("u_1");
  });

  it("returns null for invalid JSON", () => {
    const cookieStore = createMockCookieStore();
    cookieStore.set("auth_session", "not-json");
    expect(getSessionFromCookies(cookieStore as any)).toBeNull();
  });

  it("returns null when cookie not present", () => {
    const cookieStore = createMockCookieStore();
    expect(getSessionFromCookies(cookieStore as any)).toBeNull();
  });
});
