import type {
  LoginParams,
  LoginResult,
  MFAChallengeParams,
  TokenPair,
  UserResource,
} from "@inai-dev/types";

export interface AuthAPI {
  login(params: LoginParams): Promise<LoginResult>;
  register(params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<LoginResult & { user?: UserResource }>;
  mfaChallenge(params: MFAChallengeParams): Promise<TokenPair>;
  refresh(refreshToken: string): Promise<TokenPair>;
  logout(refreshToken: string): Promise<void>;
  getMe(accessToken: string): Promise<{ data: UserResource }>;
  setActiveOrganization(
    accessToken: string,
    organizationId: string | null,
  ): Promise<TokenPair>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }>;
  verifyEmail(token: string): Promise<{ message: string }>;
}
