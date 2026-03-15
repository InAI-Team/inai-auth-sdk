import type { JWTClaims } from "@inai-dev/types";

function base64urlDecode(str: string): Uint8Array {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  if (remainder === 2) padded += "==";
  else if (remainder === 3) padded += "=";
  const binString = atob(padded);
  return Uint8Array.from(binString, (ch) => ch.charCodeAt(0));
}

function base64urlToString(str: string): string {
  return new TextDecoder().decode(base64urlDecode(str));
}

export function decodeJWTPayload(token: string): JWTClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64urlToString(parts[1]));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeJWTPayload(token);
  if (!claims?.exp) return true;
  return Date.now() >= claims.exp * 1000;
}

export function getClaimsFromToken(token: string): JWTClaims | null {
  return decodeJWTPayload(token);
}

export function decodeJWTHeader(token: string): { alg: string; kid: string; typ?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64urlToString(parts[0]));
  } catch {
    return null;
  }
}

export async function importJWKPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

export async function verifyES256(token: string, publicKey: CryptoKey): Promise<JWTClaims | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const signingInput = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlDecode(signatureB64);

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature.buffer as ArrayBuffer,
      signingInput,
    );

    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as JWTClaims;

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
