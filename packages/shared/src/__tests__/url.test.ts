import { describe, it, expect } from "vitest";
import { normalizeApiUrl, buildEndpoint } from "../url";

describe("normalizeApiUrl", () => {
  it("removes trailing slash", () => {
    expect(normalizeApiUrl("https://api.example.com/")).toBe("https://api.example.com");
  });

  it("leaves URLs without trailing slash unchanged", () => {
    expect(normalizeApiUrl("https://api.example.com")).toBe("https://api.example.com");
  });

  it("handles multiple trailing slashes by removing the last one", () => {
    expect(normalizeApiUrl("https://api.example.com//")).toBe("https://api.example.com/");
  });
});

describe("buildEndpoint", () => {
  it("combines base URL and path", () => {
    expect(buildEndpoint("https://api.example.com", "/api/v1/auth/login"))
      .toBe("https://api.example.com/api/v1/auth/login");
  });

  it("normalizes trailing slash on base URL", () => {
    expect(buildEndpoint("https://api.example.com/", "/api/v1/auth/login"))
      .toBe("https://api.example.com/api/v1/auth/login");
  });
});
