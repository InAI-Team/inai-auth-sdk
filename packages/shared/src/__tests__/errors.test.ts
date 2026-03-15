import { describe, it, expect } from "vitest";
import { InAIAuthError } from "../errors";

describe("InAIAuthError", () => {
  it("creates an error with correct RFC 7807 properties", () => {
    const body = { type: "unauthorized", title: "Invalid credentials", status: 401, detail: "Bad password", instance: "/api/v1/auth/login" };
    const err = new InAIAuthError("Bad password", 401, body);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("InAIAuthError");
    expect(err.message).toBe("Bad password");
    expect(err.status).toBe(401);
    expect(err.code).toBe("unauthorized");
    expect(err.body).toEqual(body);
  });

  it("handles null body", () => {
    const err = new InAIAuthError("Server error", 500, null);
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.body.detail).toBe("Server error");
    expect(err.body.type).toBe("UNKNOWN_ERROR");
    expect(err.body.title).toBe("Server error");
    expect(err.body.status).toBe(500);
    expect(err.body.instance).toBeUndefined();
  });

  it("handles body without optional fields", () => {
    const err = new InAIAuthError("Not found", 404, { type: "not_found", title: "Not Found", status: 404, detail: "Resource not found" });
    expect(err.code).toBe("not_found");
    expect(err.body.instance).toBeUndefined();
  });
});
