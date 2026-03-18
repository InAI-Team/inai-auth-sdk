export { inaiAuthMiddleware, requireAuth } from "./middleware";
export type { InAIExpressMiddlewareConfig, RequireAuthConfig } from "./types";

export {
  getAuth,
  setAuthCookies,
  clearAuthCookies,
  isSessionExpired,
  getTokenFromRequest,
  getRefreshTokenFromRequest,
} from "./helpers";

export { createAuthRoutes } from "./api-routes";
export { createPlatformAuthRoutes } from "./platform-api-routes";

export type {
  AuthObject,
  UserResource,
  OrganizationResource,
} from "@inai-dev/types";
