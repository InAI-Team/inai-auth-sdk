import { describe, it, expect, vi, afterEach } from "vitest";
import { decodeJWTPayload, isTokenExpired, getClaimsFromToken } from "../jwt";

function makeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe("decodeJWTPayload", () => {
  it("decodes a valid JWT payload", () => {
    const claims = { sub: "user_1", tenant_id: "t_1", exp: 9999999999 };
    const token = makeJWT(claims);
    const result = decodeJWTPayload(token);
    expect(result).toMatchObject(claims);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJWTPayload("not.a.jwt")).toBeNull();
    expect(decodeJWTPayload("only-one-part")).toBeNull();
    expect(decodeJWTPayload("")).toBeNull();
  });

  it("returns null for tokens with invalid JSON", () => {
    const header = btoa("{}");
    const token = `${header}.not-base64-json.sig`;
    expect(decodeJWTPayload(token)).toBeNull();
  });
});

describe("isTokenExpired", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false for non-expired tokens", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJWT({ exp: futureExp });
    expect(isTokenExpired(token)).toBe(false);
  });

  it("returns true for expired tokens", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = makeJWT({ exp: pastExp });
    expect(isTokenExpired(token)).toBe(true);
  });

  it("returns true for tokens without exp", () => {
    const token = makeJWT({ sub: "user_1" });
    expect(isTokenExpired(token)).toBe(true);
  });

  it("returns true for invalid tokens", () => {
    expect(isTokenExpired("garbage")).toBe(true);
  });
});

describe("getClaimsFromToken", () => {
  it("is an alias for decodeJWTPayload", () => {
    const claims = { sub: "user_1", tenant_id: "t_1", exp: 9999999999 };
    const token = makeJWT(claims);
    expect(getClaimsFromToken(token)).toMatchObject(claims);
  });
});
