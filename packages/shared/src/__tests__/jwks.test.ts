import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JWKSClient } from "../jwks";

const JWKS_URL = "https://auth.example.com/.well-known/jwks.json";

// Mock CryptoKey — importJWKPublicKey returns a CryptoKey, we mock the module
vi.mock("../jwt", () => ({
  importJWKPublicKey: vi.fn(async (jwk: JsonWebKey) => {
    // Return a unique object per kid (simulates CryptoKey)
    return { __mock: true, x: jwk.x } as unknown as CryptoKey;
  }),
}));

function makeJWKSResponse(kids: string[]) {
  return {
    keys: kids.map((kid) => ({
      kty: "EC",
      crv: "P-256",
      kid,
      use: "sig",
      alg: "ES256",
      x: `x_${kid}`,
      y: `y_${kid}`,
    })),
  };
}

function mockFetchSuccess(kids: string[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => makeJWKSResponse(kids),
  });
}

function mockFetchFailure(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  });
}

describe("JWKSClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("fetches keys and returns cached key on subsequent calls", async () => {
    const fetchMock = mockFetchSuccess(["key-1"]);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 60_000, 10_000);

    const key1 = await client.getKey("key-1");
    expect(key1).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call should use cache (within TTL, no invalidation)
    const key2 = await client.getKey("key-1");
    expect(key2).toBe(key1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("respects minRefetchInterval throttling", async () => {
    const fetchMock = mockFetchSuccess(["key-1"]);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 1_000, 10_000);

    await client.getKey("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Expire cache TTL but NOT minRefetchInterval
    vi.advanceTimersByTime(2_000);

    // Cache is stale, but interval hasn't passed — should NOT refetch
    await client.getKey("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invalidate() marks cache as stale", async () => {
    const fetchMock = mockFetchSuccess(["key-1"]);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 60_000, 10_000);

    await client.getKey("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Invalidate and advance past minRefetchInterval
    client.invalidate();
    vi.advanceTimersByTime(11_000);

    await client.getKey("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidate() within minRefetchInterval does NOT refetch", async () => {
    const fetchMock = mockFetchSuccess(["key-1"]);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 60_000, 10_000);

    await client.getKey("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Invalidate but DON'T advance past interval
    client.invalidate();
    vi.advanceTimersByTime(5_000);

    await client.getKey("key-1");
    // Should use stale cache, no refetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invalidate() + getKey() after interval refetches", async () => {
    const fetchMock = mockFetchSuccess(["key-1"]);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 60_000, 10_000);

    await client.getKey("key-1");
    client.invalidate();

    vi.advanceTimersByTime(15_000);

    await client.getKey("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws for unknown kid after fetch", async () => {
    globalThis.fetch = mockFetchSuccess(["key-1"]) as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 60_000, 10_000);

    await expect(client.getKey("unknown-kid")).rejects.toThrow("Unknown key ID: unknown-kid");
  });

  it("failed fetch does not update lastFetchedAt but throttles via lastAttemptedAt", async () => {
    const failingFetch = mockFetchFailure(500);
    globalThis.fetch = failingFetch as unknown as typeof fetch;

    const client = new JWKSClient(JWKS_URL, 60_000, 10_000);

    // First call — fetch fails
    await expect(client.getKey("key-1")).rejects.toThrow("Failed to fetch JWKS");
    expect(failingFetch).toHaveBeenCalledTimes(1);

    // Second call within interval — should NOT attempt fetch again (throttled by lastAttemptedAt)
    await expect(client.getKey("key-1")).rejects.toThrow("Unknown key ID: key-1");
    expect(failingFetch).toHaveBeenCalledTimes(1);

    // After interval passes, retry is allowed
    vi.advanceTimersByTime(11_000);
    const successFetch = mockFetchSuccess(["key-1"]);
    globalThis.fetch = successFetch as unknown as typeof fetch;

    const key = await client.getKey("key-1");
    expect(key).toBeDefined();
    expect(successFetch).toHaveBeenCalledTimes(1);
  });
});
