import type { AuthObject } from "@inai-dev/types";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthObject | null;
    }
  }
}

export interface InAIExpressMiddlewareConfig {
  authMode?: "app" | "platform";
  publicRoutes?: string[] | ((req: Request) => boolean);
  onUnauthorized?: (req: Request, res: Response, next: NextFunction) => void;
  beforeAuth?: (req: Request, res: Response) => boolean | void;
  afterAuth?: (auth: AuthObject, req: Request, res: Response) => void;
}

export interface RequireAuthConfig {
  role?: string;
  permission?: string;
}
