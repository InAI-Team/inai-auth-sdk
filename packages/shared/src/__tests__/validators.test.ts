import { describe, it, expect } from "vitest";
import { isValidEmail, isStrongPassword } from "../validators";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("user+tag@domain.org")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false);
  });
});

describe("isStrongPassword", () => {
  it("accepts strong passwords", () => {
    const result = isStrongPassword("MyPass1word");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects short passwords", () => {
    const result = isStrongPassword("Ab1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters");
  });

  it("requires uppercase letter", () => {
    const result = isStrongPassword("mypass1word");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain an uppercase letter");
  });

  it("requires lowercase letter", () => {
    const result = isStrongPassword("MYPASS1WORD");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain a lowercase letter");
  });

  it("requires a number", () => {
    const result = isStrongPassword("MyPassword");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain a number");
  });

  it("returns multiple errors at once", () => {
    const result = isStrongPassword("ab");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
