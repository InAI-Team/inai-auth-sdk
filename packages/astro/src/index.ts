export { inaiAuth } from "./integration";
export type { InAIAstroConfig } from "./integration";

export { inaiAstroMiddleware } from "./middleware";
export type { InAIAstroMiddlewareConfig } from "./middleware";

export { auth, currentUser, setAuthCookies, clearAuthCookies } from "./server";
export { createAuthRoutes } from "./api-routes";
export type { AstroCookies, AstroAPIContext } from "./api-routes";

export type {
  AuthObject,
  UserResource,
  OrganizationResource,
} from "@inai-dev/types";
