import { describe, it, expect } from "vitest";
import { decodeJWTHeader, verifyES256, importJWKPublicKey } from "../jwt";

// Generate a test key pair for ES256 verification tests
async function generateTestKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { privateKeyJwk, publicKeyJwk, privateKey: keyPair.privateKey, publicKey: keyPair.publicKey };
}

function base64urlEncode(data: Uint8Array): string {
  const binString = Array.from(data, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createSignedToken(
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
  kid: string,
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT", kid };
  const encoder = new TextEncoder();

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(signingInput),
  );

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

describe("decodeJWTHeader", () => {
  it("decodes ES256 header with kid", () => {
    const header = btoa(JSON.stringify({ alg: "ES256", kid: "key-1", typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const token = `${header}.payload.signature`;
    const result = decodeJWTHeader(token);
    expect(result).toEqual({ alg: "ES256", kid: "key-1", typ: "JWT" });
  });

  it("returns null for invalid token", () => {
    expect(decodeJWTHeader("garbage")).toBeNull();
    expect(decodeJWTHeader("")).toBeNull();
  });
});

describe("verifyES256", () => {
  it("verifies a valid ES256 signed token", async () => {
    const { privateKey, publicKey } = await generateTestKeyPair();

    const payload = {
      sub: "user_1",
      tenant_id: "t_1",
      roles: ["admin"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = await createSignedToken(payload, privateKey, "test-kid");
    const result = await verifyES256(token, publicKey);

    expect(result).not.toBeNull();
    expect(result!.sub).toBe("user_1");
    expect(result!.tenant_id).toBe("t_1");
  });

  it("returns null for expired token", async () => {
    const { privateKey, publicKey } = await generateTestKeyPair();

    const payload = {
      sub: "user_1",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };

    const token = await createSignedToken(payload, privateKey, "test-kid");
    const result = await verifyES256(token, publicKey);

    expect(result).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const { privateKey, publicKey } = await generateTestKeyPair();

    const payload = { sub: "user_1", exp: Math.floor(Date.now() / 1000) + 3600 };
    const token = await createSignedToken(payload, privateKey, "test-kid");

    // Tamper with the payload
    const parts = token.split(".");
    const tamperedPayload = base64urlEncode(
      new TextEncoder().encode(JSON.stringify({ sub: "hacker", exp: payload.exp }))
    );
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = await verifyES256(tamperedToken, publicKey);
    expect(result).toBeNull();
  });

  it("returns null for token signed with different key", async () => {
    const { privateKey: key1Private } = await generateTestKeyPair();
    const { publicKey: key2Public } = await generateTestKeyPair();

    const payload = { sub: "user_1", exp: Math.floor(Date.now() / 1000) + 3600 };
    const token = await createSignedToken(payload, key1Private, "key-1");

    const result = await verifyES256(token, key2Public);
    expect(result).toBeNull();
  });
});

describe("importJWKPublicKey", () => {
  it("imports a JWK public key", async () => {
    const { publicKeyJwk } = await generateTestKeyPair();
    const key = await importJWKPublicKey(publicKeyJwk);
    expect(key).toBeDefined();
    expect(key.type).toBe("public");
  });
});
