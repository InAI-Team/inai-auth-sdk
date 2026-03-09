import { describe, it, expect } from "vitest";
import { createRouteMatcher } from "../middleware";

// We test createRouteMatcher and matchesRoute logic independently
// since inaiAuthMiddleware requires NextRequest which needs a full Next.js environment

function makeReq(pathname: string) {
  return { nextUrl: { pathname } } as any;
}

describe("createRouteMatcher", () => {
  it("matches exact string patterns", () => {
    const matcher = createRouteMatcher(["/login", "/register"]);
    expect(matcher(makeReq("/login"))).toBe(true);
    expect(matcher(makeReq("/register"))).toBe(true);
    expect(matcher(makeReq("/dashboard"))).toBe(false);
  });

  it("matches glob-style trailing wildcard", () => {
    const matcher = createRouteMatcher(["/api/*"]);
    expect(matcher(makeReq("/api/users"))).toBe(true);
    expect(matcher(makeReq("/api/auth/login"))).toBe(true);
    expect(matcher(makeReq("/dashboard"))).toBe(false);
  });

  it("matches RegExp patterns", () => {
    const matcher = createRouteMatcher([/^\/user\/\d+$/]);
    expect(matcher(makeReq("/user/123"))).toBe(true);
    expect(matcher(makeReq("/user/abc"))).toBe(false);
  });

  it("matches mix of string and RegExp", () => {
    const matcher = createRouteMatcher(["/login", /^\/api\/.*/]);
    expect(matcher(makeReq("/login"))).toBe(true);
    expect(matcher(makeReq("/api/data"))).toBe(true);
    expect(matcher(makeReq("/dashboard"))).toBe(false);
  });

  it("handles empty patterns", () => {
    const matcher = createRouteMatcher([]);
    expect(matcher(makeReq("/anything"))).toBe(false);
  });
});
