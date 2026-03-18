import "./types";

export { inaiAuthMiddleware, requireAuth } from "./middleware";
export type { InAIHonoMiddlewareConfig, RequireAuthConfig } from "./types";

export {
  getAuth,
  setAuthCookies,
  clearAuthCookies,
  isSessionExpired,
  getTokenFromContext,
  getRefreshTokenFromContext,
} from "./helpers";

export { createAuthRoutes } from "./api-routes";
export { createPlatformAuthRoutes } from "./platform-api-routes";

export type {
  AuthObject,
  UserResource,
  OrganizationResource,
} from "@inai-dev/types";
