import { describe, it, expect } from "vitest";
import { InAIAuthError } from "../errors";

describe("InAIAuthError", () => {
  it("creates an error with correct properties", () => {
    const body = { code: "INVALID_CREDENTIALS", detail: "Bad password", field: "password" };
    const err = new InAIAuthError("Bad password", 401, body);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("InAIAuthError");
    expect(err.message).toBe("Bad password");
    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_CREDENTIALS");
    expect(err.body).toEqual(body);
  });

  it("handles null body", () => {
    const err = new InAIAuthError("Server error", 500, null);
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.body.detail).toBe("Server error");
    expect(err.body.field).toBeUndefined();
  });

  it("handles body without optional fields", () => {
    const err = new InAIAuthError("Not found", 404, { code: "NOT_FOUND", detail: "Resource not found" });
    expect(err.code).toBe("NOT_FOUND");
    expect(err.body.field).toBeUndefined();
  });
});
