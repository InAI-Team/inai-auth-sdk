// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { InAIAuthContext, type InAIAuthContextValue } from "../context";
import { SignedIn } from "../components/signed-in";
import { SignedOut } from "../components/signed-out";
import { Protect } from "../components/protect";

function createMockContext(overrides: Partial<InAIAuthContextValue> = {}): InAIAuthContextValue {
  return {
    isLoaded: true,
    isSignedIn: false,
    user: null,
    userId: null,
    tenantId: null,
    orgId: null,
    orgRole: null,
    roles: [],
    permissions: [],
    has: () => false,
    signOut: async () => {},
    refreshSession: async () => {},
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

function Wrapper({
  value,
  children,
}: {
  value: InAIAuthContextValue;
  children: React.ReactNode;
}) {
  return (
    <InAIAuthContext.Provider value={value}>
      {children}
    </InAIAuthContext.Provider>
  );
}

describe("SignedIn", () => {
  it("renders children when signed in", () => {
    const ctx = createMockContext({ isSignedIn: true });
    render(
      <Wrapper value={ctx}>
        <SignedIn><span>Visible</span></SignedIn>
      </Wrapper>,
    );
    expect(screen.getByText("Visible")).toBeDefined();
  });

  it("renders nothing when signed out", () => {
    const ctx = createMockContext({ isSignedIn: false });
    render(
      <Wrapper value={ctx}>
        <SignedIn><span>Hidden</span></SignedIn>
      </Wrapper>,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("renders nothing when not loaded", () => {
    const ctx = createMockContext({ isLoaded: false, isSignedIn: true });
    render(
      <Wrapper value={ctx}>
        <SignedIn><span>Hidden</span></SignedIn>
      </Wrapper>,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });
});

describe("SignedOut", () => {
  it("renders children when signed out", () => {
    const ctx = createMockContext({ isSignedIn: false });
    render(
      <Wrapper value={ctx}>
        <SignedOut><span>Sign in please</span></SignedOut>
      </Wrapper>,
    );
    expect(screen.getByText("Sign in please")).toBeDefined();
  });

  it("renders nothing when signed in", () => {
    const ctx = createMockContext({ isSignedIn: true });
    render(
      <Wrapper value={ctx}>
        <SignedOut><span>Hidden</span></SignedOut>
      </Wrapper>,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });
});

describe("Protect", () => {
  it("renders children when signed in with no role/permission requirement", () => {
    const ctx = createMockContext({ isSignedIn: true });
    render(
      <Wrapper value={ctx}>
        <Protect><span>Protected</span></Protect>
      </Wrapper>,
    );
    expect(screen.getByText("Protected")).toBeDefined();
  });

  it("renders fallback when not signed in", () => {
    const ctx = createMockContext({ isSignedIn: false });
    render(
      <Wrapper value={ctx}>
        <Protect fallback={<span>Denied</span>}><span>Protected</span></Protect>
      </Wrapper>,
    );
    expect(screen.getByText("Denied")).toBeDefined();
    expect(screen.queryByText("Protected")).toBeNull();
  });

  it("renders children when user has required role", () => {
    const ctx = createMockContext({
      isSignedIn: true,
      has: ({ role }) => role === "admin",
    });
    render(
      <Wrapper value={ctx}>
        <Protect role="admin"><span>Admin content</span></Protect>
      </Wrapper>,
    );
    expect(screen.getByText("Admin content")).toBeDefined();
  });

  it("renders fallback when user lacks required role", () => {
    const ctx = createMockContext({
      isSignedIn: true,
      has: () => false,
    });
    render(
      <Wrapper value={ctx}>
        <Protect role="admin" fallback={<span>No access</span>}>
          <span>Admin content</span>
        </Protect>
      </Wrapper>,
    );
    expect(screen.getByText("No access")).toBeDefined();
    expect(screen.queryByText("Admin content")).toBeNull();
  });
});
