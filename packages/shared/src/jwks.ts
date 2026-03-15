import { importJWKPublicKey } from "./jwt";

interface JWKSResponse {
  keys: Array<{
    kty: string;
    crv: string;
    kid: string;
    use: string;
    alg: string;
    x: string;
    y: string;
  }>;
}

export class JWKSClient {
  private cache: Map<string, CryptoKey> = new Map();
  private rawKeys: Map<string, JsonWebKey> = new Map();
  private lastFetchedAt = 0;
  private lastAttemptedAt = 0;
  private pendingInvalidation = false;
  private jwksUrl: string;
  private cacheTTL: number;
  private minRefetchInterval: number;

  constructor(jwksUrl: string, cacheTTL = 5 * 60 * 1000, minRefetchInterval = 10_000) {
    this.jwksUrl = jwksUrl;
    this.cacheTTL = cacheTTL;
    this.minRefetchInterval = minRefetchInterval;
  }

  async getKey(kid: string): Promise<CryptoKey> {
    // Return from cache if fresh AND not invalidated
    if (this.isCacheFresh() && !this.pendingInvalidation) {
      const cached = this.cache.get(kid);
      if (cached) return cached;
    }

    // Only refetch if minRefetchInterval has passed since last attempt
    if (Date.now() - this.lastAttemptedAt >= this.minRefetchInterval) {
      await this.fetchKeys();
      this.pendingInvalidation = false;
    } else {
      // Can't refetch yet — drop the invalidation, use stale cache
      this.pendingInvalidation = false;
    }

    const key = this.cache.get(kid);
    if (key) return key;

    throw new Error(`Unknown key ID: ${kid}`);
  }

  private isCacheFresh(): boolean {
    return Date.now() - this.lastFetchedAt < this.cacheTTL;
  }

  private async fetchKeys(): Promise<void> {
    this.lastAttemptedAt = Date.now();
    const res = await fetch(this.jwksUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch JWKS: ${res.status}`);
    }

    const data = (await res.json()) as JWKSResponse;

    this.cache.clear();
    this.rawKeys.clear();

    for (const jwk of data.keys) {
      if (jwk.kty !== "EC" || jwk.crv !== "P-256" || jwk.alg !== "ES256") continue;

      const publicKeyJwk: JsonWebKey = {
        kty: jwk.kty,
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y,
      };

      const cryptoKey = await importJWKPublicKey(publicKeyJwk);
      this.cache.set(jwk.kid, cryptoKey);
      this.rawKeys.set(jwk.kid, publicKeyJwk);
    }

    this.lastFetchedAt = Date.now();
  }

  /** Mark cache as stale. Actual refetch respects minRefetchInterval to prevent DoS. */
  invalidate(): void {
    this.pendingInvalidation = true;
  }
}
