export interface UserResource {
  id: string;
  tenantId?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  externalId?: string | null;
  roles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformUserResource {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResource {
  id: string;
  userId: string;
  tenantId: string;
  environmentId: string | null;
  activeOrgId: string | null;
  expiresAt: string;
}

export interface OrganizationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  homeUrl: string | null;
  callbackUrls: string[] | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  authConfig: Record<string, unknown> | null;
  environments: EnvironmentResource[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentResource {
  id: string;
  name: string;
  publishableKey: string;
  isActive: boolean;
}

export interface ApplicationStats {
  totalUsers: number;
  activeSessions: number;
  totalRoles: number;
  totalApiKeys: number;
  environments: Array<{
    id: string;
    name: string;
    userCount: number;
    sessionCount: number;
  }>;
}

export interface ApiKeyResource {
  id: string;
  name: string;
  keyPrefix: string;
  keyType: string;
  environmentId: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
