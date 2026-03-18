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
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
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
  userEmail: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface OrganizationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  metadata: unknown | null;
  createdBy: string | null;
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

export interface RoleResource {
  id: string;
  tenantId: string;
  environmentId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  hierarchyLevel: number;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResource {
  id: string;
  tenantId: string;
  environmentId: string | null;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformMemberResource {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PlatformInvitationResource {
  id: string;
  tenantId: string;
  email: string;
  roleId: string;
  roleName?: string;
  invitedBy: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookResource {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateResource {
  id: string;
  applicationId: string;
  environmentId: string | null;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogResource {
  id: string;
  userId: string | null;
  userEmail: string | null;
  administratorId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  administratorEmail: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AppSessionResource {
  id: string;
  userId: string;
  userEmail: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  environmentId: string;
  expiresAt: string;
  createdAt: string;
}

export interface OrganizationMemberResource {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleName: string;
  roleId: string;
  createdAt: string;
}

export interface InvitationResource {
  id: string;
  tenantId: string;
  environmentId: string | null;
  email: string;
  roleId: string | null;
  roleName: string | null;
  invitedBy: string | null;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MfaSetupResponse {
  secret: string;
  otpauth_uri: string;
  qr_data: string;
}

export interface BackupCodesResponse {
  backup_codes: string[];
  count: number;
}

export interface ImportUsersResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: Array<{ row: number; email?: string; error: string }>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
