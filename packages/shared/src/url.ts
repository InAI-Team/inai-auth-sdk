export function normalizeApiUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function buildEndpoint(apiUrl: string, path: string): string {
  return `${normalizeApiUrl(apiUrl)}${path}`;
}
