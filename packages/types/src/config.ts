export interface InAIAuthConfig {
  apiUrl: string;
  publishableKey?: string;
  tenantId?: string;
}

export interface InAIMiddlewareConfig {
  publicRoutes?: string[] | ((req: unknown) => boolean);
  signInUrl?: string;
  beforeAuth?: (req: unknown) => unknown | void;
  afterAuth?: (auth: unknown, req: unknown) => unknown | void;
}

export interface InAIAuthSDKConfig {
  signInUrl?: string;
  signUpUrl?: string;
  afterSignInUrl?: string;
  afterSignOutUrl?: string;
  apiUrl?: string;
  publishableKey?: string;
}
