import { describe, it, expect } from "vitest";
import { buildAuthObjectFromToken, buildAuthObjectFromClaims } from "../tokens";

function makeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe("buildAuthObjectFromToken", () => {
  it("returns AuthObject for valid non-expired token", () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      app_id: "app_1",
      env_id: "env_1",
      roles: ["admin"],
      permissions: ["read", "write"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = makeJWT(claims);
    const auth = buildAuthObjectFromToken(token);

    expect(auth).not.toBeNull();
    expect(auth!.userId).toBe("user_1");
    expect(auth!.tenantId).toBe("t_1");
    expect(auth!.appId).toBe("app_1");
    expect(auth!.sessionId).toBeNull();
  });

  it("returns null for expired token", () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const token = makeJWT(claims);
    expect(buildAuthObjectFromToken(token)).toBeNull();
  });

  it("returns null for invalid token", () => {
    expect(buildAuthObjectFromToken("garbage")).toBeNull();
  });
});

describe("buildAuthObjectFromClaims", () => {
  it("has() uses OR logic for role and permission", () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      type: "app_user" as const,
      email: "test@test.com",
      roles: ["admin"],
      permissions: ["read"],
      iat: 0,
      exp: 9999999999,
    };
    const auth = buildAuthObjectFromClaims(claims, "token");

    // OR logic: returns true if EITHER matches
    expect(auth.has({ role: "admin" })).toBe(true);
    expect(auth.has({ permission: "read" })).toBe(true);
    expect(auth.has({ role: "user" })).toBe(false);
    expect(auth.has({ permission: "write" })).toBe(false);

    // When both provided, OR logic: true if either matches
    expect(auth.has({ role: "admin", permission: "write" })).toBe(true);
    expect(auth.has({ role: "user", permission: "read" })).toBe(true);
    expect(auth.has({ role: "user", permission: "write" })).toBe(false);
  });

  it("getToken returns the token", async () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      type: "app_user" as const,
      email: "test@test.com",
      roles: [],
      permissions: [],
      iat: 0,
      exp: 9999999999,
    };
    const auth = buildAuthObjectFromClaims(claims, "my-token");
    expect(await auth.getToken()).toBe("my-token");
  });

  it("handles missing optional fields", () => {
    const claims = {
      sub: "user_1",
      tenant_id: "t_1",
      type: "app_user" as const,
      email: "test@test.com",
      roles: [],
      permissions: [],
      iat: 0,
      exp: 9999999999,
    };
    const auth = buildAuthObjectFromClaims(claims, "token");
    expect(auth.orgId).toBeNull();
    expect(auth.orgRole).toBeNull();
    expect(auth.appId).toBeNull();
    expect(auth.envId).toBeNull();
  });
});
