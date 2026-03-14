import "./types";

export { inaiAuthMiddleware, requireAuth } from "./middleware";
export type { InAIHonoMiddlewareConfig, RequireAuthConfig } from "./types";

export {
  getAuth,
  setAuthCookies,
  clearAuthCookies,
  getTokenFromContext,
  getRefreshTokenFromContext,
} from "./helpers";

export { createAuthRoutes } from "./api-routes";

export type {
  AuthObject,
  UserResource,
  OrganizationResource,
} from "@inai-dev/types";
