import type {
  LoginParams,
  LoginResult,
  MFAChallengeParams,
  TokenPair,
  PlatformUserResource,
} from "@inai-dev/types";

export interface PlatformAPI {
  platformLogin(
    params: LoginParams,
  ): Promise<LoginResult & { user?: PlatformUserResource }>;
  platformRefresh(refreshToken: string): Promise<TokenPair>;
  platformLogout(accessToken: string): Promise<void>;
  platformMfaChallenge(
    params: MFAChallengeParams,
  ): Promise<TokenPair & { user?: PlatformUserResource }>;
  platformGetMe(
    accessToken: string,
  ): Promise<{ data: PlatformUserResource }>;
}
