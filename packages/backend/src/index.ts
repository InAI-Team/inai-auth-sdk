export { InAIAuthClient } from "./client";
export { InAIAuthError } from "@inai-dev/shared";
export {
  buildAuthObjectFromToken,
  buildAuthObjectFromClaims,
  getClaimsFromToken,
  isTokenExpired,
} from "./tokens";

// Re-export types for convenience
export type {
  InAIAuthConfig,
  AuthObject,
  ServerAuthObject,
  ProtectedAuthObject,
  UserResource,
  PlatformUserResource,
  SessionResource,
  OrganizationResource,
  ApplicationResource,
  EnvironmentResource,
  ApplicationStats,
  ApiKeyResource,
  PaginatedResult,
  JWTClaims,
  LoginParams,
  LoginResult,
  MFAChallengeParams,
  TokenPair,
  SignInResult,
  SignUpResult,
  InAIAuthErrorBody,
} from "@inai-dev/types";
