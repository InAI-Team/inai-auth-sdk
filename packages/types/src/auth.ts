export interface AuthObject {
  userId: string | null;
  tenantId: string | null;
  appId: string | null;
  envId: string | null;
  orgId: string | null;
  orgRole: string | null;
  sessionId: string | null;
  roles: string[];
  permissions: string[];
  getToken: () => Promise<string | null>;
  has: (params: { role?: string; permission?: string }) => boolean;
}

export interface ServerAuthObject extends AuthObject {
  protect: (params?: {
    role?: string;
    permission?: string;
    redirectTo?: string;
  }) => ProtectedAuthObject;
  redirectToSignIn: (opts?: { returnTo?: string }) => never;
}

export interface ProtectedAuthObject {
  userId: string;
  tenantId: string;
  appId: string | null;
  envId: string | null;
  orgId: string | null;
  orgRole: string | null;
  sessionId: string | null;
  roles: string[];
  permissions: string[];
  isSignedIn: true;
  getToken: () => Promise<string>;
  has: (params: { role?: string; permission?: string }) => boolean;
}

export interface JWTClaims {
  sub: string;
  type: "app_user" | "platform";
  tenant_id: string;
  env_id?: string;
  app_id?: string;
  email: string;
  roles: string[];
  permissions: string[];
  org_id?: string;
  org_slug?: string;
  org_role?: string;
  org_permissions?: string[];
  external_id?: string;
  iat: number;
  exp: number;
}
