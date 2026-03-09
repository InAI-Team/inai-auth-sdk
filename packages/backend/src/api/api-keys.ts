import type { ApiKeyResource } from "@inai-dev/types";

export interface ApiKeysAPI {
  listAppApiKeys(
    accessToken: string,
    appId: string,
    environmentId?: string,
  ): Promise<{ data: ApiKeyResource[] }>;
  createAppApiKey(
    accessToken: string,
    appId: string,
    name: string,
    environmentId: string,
  ): Promise<{ data: ApiKeyResource & { key: string } }>;
  revokeAppApiKey(
    accessToken: string,
    appId: string,
    keyId: string,
  ): Promise<void>;
  rotateAppKeys(
    accessToken: string,
    appId: string,
    environmentId: string,
  ): Promise<{ publishableKey: string }>;
}
