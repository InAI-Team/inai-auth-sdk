import type { AuthObject } from "@inai-dev/types";
import type { Context } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    inaiAuth: AuthObject | null;
  }
}

export interface InAIHonoMiddlewareConfig {
  authMode?: "app" | "platform";
  publicRoutes?: string[] | ((path: string) => boolean);
  onUnauthorized?: (c: Context) => Response | Promise<Response>;
}

export interface RequireAuthConfig {
  role?: string;
  permission?: string;
}
