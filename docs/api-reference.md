# API Reference

Complete reference for all exports from the InAI Auth SDK.

## @inai-dev/backend (Core)

Import path: `@inai-dev/backend`

### InAIAuthClient

HTTP client for communicating with the InAI Auth API.

```ts
import { InAIAuthClient } from "@inai-dev/backend";

const client = new InAIAuthClient({
  publishableKey: "pk_live_xxx",  // optional, required for /api/v1/ routes — auto-read from INAI_PUBLISHABLE_KEY env var
  tenantId: "tenant_xxx",         // optional
});
```

#### App User Auth Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `login` | `(params: LoginParams) => Promise<LoginResult>` | Authenticate with email/password. Returns tokens or MFA challenge. |
| `register` | `(params: { email, password, firstName?, lastName? }) => Promise<LoginResult & { user? }>` | Create a new user account. May return tokens or require email verification. |
| `mfaChallenge` | `(params: MFAChallengeParams) => Promise<TokenPair>` | Submit a TOTP code to complete MFA. Returns tokens on success. |
| `refresh` | `(refreshToken: string) => Promise<TokenPair>` | Exchange a refresh token for a new token pair. |
| `logout` | `(refreshToken: string) => Promise<void>` | Invalidate the refresh token server-side. |
| `getMe` | `(accessToken: string) => Promise<{ data: UserResource }>` | Fetch the current user's profile. |
| `setActiveOrganization` | `(accessToken, orgId \| null) => Promise<TokenPair>` | Switch the user's active organization. Returns new tokens with updated org claims. |
| `forgotPassword` | `(email: string) => Promise<{ message }>` | Request a password reset email. |
| `resetPassword` | `(token, password) => Promise<{ message }>` | Reset password using the token from the email link. |
| `verifyEmail` | `(token: string) => Promise<{ message }>` | Verify an email address using the token from the verification email. |
| `getOAuthInitUrl` | `(provider, redirectUri) => string` | Build an OAuth initialization URL for the given provider (`"github"`, `"google"`, `"instagram"`). |
| `revokeAllSessions` | `(accessToken, { password, keepCurrent? }) => Promise<{ revoked }>` | Revoke all user sessions. Requires current password. `keepCurrent: true` preserves the calling session. |

#### Platform Auth Methods

Used by admin panels for developer/operator authentication.

| Method | Signature | Description |
|--------|-----------|-------------|
| `platformLogin` | `(params: LoginParams) => Promise<LoginResult & { user? }>` | Platform user login. |
| `platformRefresh` | `(refreshToken: string) => Promise<TokenPair>` | Refresh platform tokens. |
| `platformLogout` | `(accessToken: string) => Promise<void>` | Invalidate platform session. |
| `platformMfaChallenge` | `(params: MFAChallengeParams) => Promise<TokenPair & { user? }>` | Complete platform MFA. |
| `platformGetMe` | `(accessToken: string) => Promise<{ data: PlatformUserResource }>` | Fetch platform user profile. |
| `platformRegister` | `(params: { email, password, firstName?, lastName?, tenantName, tenantSlug }) => Promise<LoginResult & { user?, tenant? }>` | Register a new platform user and tenant. |
| `initializeEmailTemplates` | `(accessToken: string) => Promise<{ data: { created } }>` | Create default email templates for the tenant. |

#### Platform Management Methods

Used by admin panels to manage applications and users.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listApplications` | `(accessToken) => Promise<{ data: ApplicationResource[] }>` | List all applications for the tenant. |
| `createApplication` | `(accessToken, { name, slug, domain?, homeUrl? }) => Promise<{ data: ApplicationResource }>` | Create a new application. |
| `getApplication` | `(accessToken, appId) => Promise<{ data: ApplicationResource }>` | Get application details. |
| `updateApplication` | `(accessToken, appId, data) => Promise<{ data: ApplicationResource }>` | Update application settings. |
| `getApplicationStats` | `(accessToken, appId) => Promise<{ data: ApplicationStats }>` | Get user/session counts. |
| `listAppUsers` | `(accessToken, appId, { environmentId?, page?, limit? }) => Promise<PaginatedResult<UserResource>>` | List users for an app. |
| `createAppUser` | `(accessToken, appId, { email, password, firstName?, lastName?, environmentId }) => Promise<{ data: UserResource }>` | Create a user in an app. |
| `listAppApiKeys` | `(accessToken, appId, environmentId?) => Promise<{ data: ApiKeyResource[] }>` | List API keys. |
| `createAppApiKey` | `(accessToken, appId, name, environmentId) => Promise<{ data: ApiKeyResource & { key } }>` | Create an API key (full key returned only once). |
| `revokeAppApiKey` | `(accessToken, appId, keyId) => Promise<void>` | Revoke an API key. |
| `rotateAppKeys` | `(accessToken, appId, environmentId) => Promise<{ publishableKey }>` | Rotate environment publishable key. |

#### V1 User Management Methods

Used by applications to manage their users via publishable key.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listUsers` | `(accessToken, params?) => Promise<PaginatedResult<UserResource>>` | List users with pagination and search. |
| `createUser` | `(accessToken, { email, password, firstName?, lastName? }) => Promise<{ data: UserResource }>` | Create a new user. |
| `getUser` | `(accessToken, userId) => Promise<{ data: UserResource }>` | Get a user by ID. |
| `getUserByExternalId` | `(accessToken, externalId) => Promise<{ data: UserResource }>` | Get a user by their external system ID. |
| `updateUser` | `(accessToken, userId, data) => Promise<{ data: UserResource }>` | Update user fields (firstName, lastName, isActive). |
| `assignUserRoles` | `(accessToken, userId, roleIds) => Promise<{ data: { userId, roles } }>` | Assign roles to a user. |

#### V1 Role & Permission Management Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `listRoles` | `(accessToken, params?) => Promise<{ data: RoleResource[] }>` | List all roles. |
| `createRole` | `(accessToken, { name, description?, hierarchyLevel? }) => Promise<{ data: RoleResource }>` | Create a new role. |
| `getRole` | `(accessToken, roleId) => Promise<{ data: RoleResource }>` | Get a role by ID. |
| `updateRole` | `(accessToken, roleId, data) => Promise<{ data: RoleResource }>` | Update a role. |
| `deleteRole` | `(accessToken, roleId) => Promise<{ success }>` | Delete a role. |
| `getRolePermissions` | `(accessToken, roleId) => Promise<{ data: PermissionResource[] }>` | Get all permissions assigned to a role. |
| `assignRolePermissions` | `(accessToken, roleId, permissionIds) => Promise<{ data: { assigned, skipped } }>` | Assign permissions to a role. |
| `removeRolePermission` | `(accessToken, roleId, permissionId) => Promise<{ success, message }>` | Remove a permission from a role. |
| `listPermissions` | `(accessToken, params?) => Promise<{ data: PermissionResource[] }>` | List all permissions. |
| `createPermission` | `(accessToken, { name, description?, resource, action }) => Promise<{ data: PermissionResource }>` | Create a new permission. |
| `deletePermission` | `(accessToken, permissionId) => Promise<{ success }>` | Delete a permission. |

#### Delete Application

| Method | Signature | Description |
|--------|-----------|-------------|
| `deleteApplication` | `(accessToken, appId) => Promise<void>` | Delete an application permanently. |

#### App User Management Methods (Platform)

Used by admin panels to manage individual app users.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getAppUser` | `(accessToken, appId, userId) => Promise<{ data: UserResource }>` | Get a specific user in an app. |
| `updateAppUser` | `(accessToken, appId, userId, { firstName?, lastName?, isActive? }) => Promise<{ data: UserResource }>` | Update an app user's profile or status. |
| `assignAppUserRoles` | `(accessToken, appId, userId, roleIds) => Promise<{ data: { userId, roles } }>` | Assign roles to a specific app user. |

#### App Role Management Methods (Platform)

Used by admin panels to manage roles within an application.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppRoles` | `(accessToken, appId, { environmentId? }?) => Promise<{ data: RoleResource[] }>` | List roles for an app. |
| `createAppRole` | `(accessToken, appId, { name, description?, environmentId?, hierarchyLevel? }) => Promise<{ data: RoleResource }>` | Create a role in an app. |
| `getAppRole` | `(accessToken, appId, roleId) => Promise<{ data: RoleResource }>` | Get a specific role. |
| `updateAppRole` | `(accessToken, appId, roleId, { name?, description? }) => Promise<{ data: RoleResource }>` | Update a role. |
| `deleteAppRole` | `(accessToken, appId, roleId) => Promise<{ success }>` | Delete a role. |
| `getAppRolePermissions` | `(accessToken, appId, roleId) => Promise<{ data: PermissionResource[] }>` | Get permissions assigned to a role. |
| `assignAppRolePermissions` | `(accessToken, appId, roleId, permissionIds) => Promise<{ data: { assigned, skipped } }>` | Assign permissions to a role. |
| `removeAppRolePermission` | `(accessToken, appId, roleId, permissionId) => Promise<{ success, message }>` | Remove a permission from a role. |

#### App Permission Management Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppPermissions` | `(accessToken, appId, { environmentId? }?) => Promise<{ data: PermissionResource[] }>` | List permissions for an app. |
| `createAppPermission` | `(accessToken, appId, { name, description?, resource, action, environmentId? }) => Promise<{ data: PermissionResource }>` | Create a permission. |
| `deleteAppPermission` | `(accessToken, appId, permissionId) => Promise<{ success }>` | Delete a permission. |

#### Platform Members Methods

Used by admin panels to manage team members and invitations.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listPlatformMembers` | `(accessToken) => Promise<{ data: PlatformMemberResource[] }>` | List all platform team members. |
| `invitePlatformMember` | `(accessToken, { email, roleName, firstName?, lastName? }) => Promise<{ data: PlatformInvitationResource, message }>` | Invite a new team member. |
| `updatePlatformMember` | `(accessToken, memberId, { roleName }) => Promise<{ data: { id, email, roles } }>` | Update a member's role. |
| `removePlatformMember` | `(accessToken, memberId) => Promise<{ message }>` | Remove a team member. |
| `listPlatformInvitations` | `(accessToken) => Promise<{ data: PlatformInvitationResource[] }>` | List pending invitations. |
| `cancelPlatformInvitation` | `(accessToken, invitationId) => Promise<{ success }>` | Cancel a pending invitation. |
| `resendPlatformInvitation` | `(accessToken, invitationId) => Promise<{ data: PlatformInvitationResource }>` | Resend an invitation email. |
| `acceptPlatformInvitation` | `(invitationId, { password, firstName?, lastName? }) => Promise<{ message }>` | Accept an invitation (no auth required). |

#### App Session Management Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppSessions` | `(accessToken, appId, { environmentId?, page?, limit? }?) => Promise<PaginatedResult<AppSessionResource>>` | List active sessions for an app. |
| `revokeAppSession` | `(accessToken, appId, sessionId) => Promise<{ message }>` | Revoke a specific session. |

#### App Audit Log Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppAuditLogs` | `(accessToken, appId, { environmentId?, page?, limit?, action? }?) => Promise<PaginatedResult<AuditLogResource>>` | List audit logs for an app. |

#### App Invitation Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppInvitations` | `(accessToken, appId, { environmentId? }?) => Promise<{ data: InvitationResource[] }>` | List invitations for an app. |
| `createAppInvitation` | `(accessToken, appId, { email, roleId?, environmentId }) => Promise<{ data: InvitationResource }>` | Create an invitation. |
| `resendAppInvitation` | `(accessToken, appId, invitationId) => Promise<{ data: InvitationResource }>` | Resend an invitation email. |
| `cancelAppInvitation` | `(accessToken, appId, invitationId) => Promise<{ success }>` | Cancel a pending invitation. |

#### App Organization Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppOrganizations` | `(accessToken, appId, { environmentId?, page?, limit? }?) => Promise<PaginatedResult<OrganizationResource>>` | List organizations in an app. |
| `createAppOrganization` | `(accessToken, appId, { name, slug, environmentId, imageUrl?, metadata? }) => Promise<{ data: OrganizationResource }>` | Create an organization. |
| `updateAppOrganization` | `(accessToken, appId, orgId, { name?, slug?, imageUrl?, metadata? }) => Promise<{ data: OrganizationResource }>` | Update an organization. |
| `deleteAppOrganization` | `(accessToken, appId, orgId) => Promise<{ success }>` | Delete an organization. |

#### App Webhook Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppWebhooks` | `(accessToken, appId) => Promise<{ data: WebhookResource[] }>` | List webhooks for an app. |
| `createAppWebhook` | `(accessToken, appId, { url, events, environmentId? }) => Promise<{ data: WebhookResource }>` | Create a webhook. |
| `deleteAppWebhook` | `(accessToken, appId, webhookId) => Promise<{ success }>` | Delete a webhook. |

#### App Email Template Methods (Platform)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAppEmailTemplates` | `(accessToken, appId, { environmentId? }?) => Promise<{ data: EmailTemplateResource[] }>` | List email templates for an app. |
| `createAppEmailTemplate` | `(accessToken, appId, { name, subject, htmlBody, textBody?, environmentId, variables? }) => Promise<{ data: EmailTemplateResource }>` | Create an email template. |
| `updateAppEmailTemplate` | `(accessToken, appId, templateId, { name?, subject?, htmlBody?, textBody?, variables?, isActive? }) => Promise<{ data: EmailTemplateResource }>` | Update an email template. |
| `previewAppEmailTemplate` | `(accessToken, appId, templateId) => Promise<{ html, text }>` | Preview rendered email template. |

#### Platform API Key Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `listPlatformApiKeys` | `(accessToken) => Promise<{ data: ApiKeyResource[] }>` | List platform-level API keys. |
| `createPlatformApiKey` | `(accessToken, { name }) => Promise<{ data: ApiKeyResource & { key } }>` | Create a platform API key (full key returned only once). |
| `revokePlatformApiKey` | `(accessToken, keyId) => Promise<void>` | Revoke a platform API key. |

#### Platform Webhook Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `listPlatformWebhooks` | `(accessToken) => Promise<{ data: WebhookResource[] }>` | List platform-level webhooks. |
| `createPlatformWebhook` | `(accessToken, { url, events }) => Promise<{ data: WebhookResource }>` | Create a platform webhook. |
| `deletePlatformWebhook` | `(accessToken, webhookId) => Promise<{ success }>` | Delete a platform webhook. |

#### Platform Email Template Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `listPlatformEmailTemplates` | `(accessToken) => Promise<{ data: EmailTemplateResource[] }>` | List platform email templates. |
| `updatePlatformEmailTemplate` | `(accessToken, templateId, { subject?, htmlBody?, textBody?, isActive? }) => Promise<{ data: EmailTemplateResource }>` | Update a platform email template. |
| `previewPlatformEmailTemplate` | `(accessToken, templateId) => Promise<{ html, text }>` | Preview rendered platform email template. |
| `initializeEmailTemplates` | `(accessToken) => Promise<{ data: EmailTemplateResource[], message }>` | Create default email templates for the tenant. |

#### Platform Audit Log Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `listPlatformAuditLogs` | `(accessToken, { page?, limit?, action? }?) => Promise<PaginatedResult<AuditLogResource>>` | List platform-level audit logs. |

#### Platform Settings Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `updatePlatformSettings` | `(accessToken, data) => Promise<{ data: Record<string, unknown> }>` | Update platform-wide settings. |

#### MFA Management Methods (App User)

Used by app users to manage their own MFA settings.

| Method | Signature | Description |
|--------|-----------|-------------|
| `enableMfa` | `(accessToken) => Promise<{ data: MfaSetupResponse }>` | Start MFA setup. Returns TOTP secret and QR code URI. |
| `verifyMfaSetup` | `(accessToken, code) => Promise<{ data: BackupCodesResponse }>` | Verify TOTP code to complete MFA setup. Returns backup codes. |
| `disableMfa` | `(accessToken, code) => Promise<{ message }>` | Disable MFA (requires current TOTP code). |
| `generateBackupCodes` | `(accessToken) => Promise<{ data: BackupCodesResponse }>` | Generate new backup codes (invalidates previous ones). |
| `verifyBackupCode` | `(accessToken, code) => Promise<{ message }>` | Verify a backup code. |
| `getRemainingBackupCodes` | `(accessToken) => Promise<{ data: { remaining } }>` | Get count of remaining valid backup codes. |

#### User Session Methods (App User)

Used by app users to manage their own sessions.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listSessions` | `(accessToken) => Promise<{ data: AppSessionResource[] }>` | List all active sessions for the current user. |
| `revokeSession` | `(accessToken, sessionId) => Promise<{ message }>` | Revoke a specific session. |
| `revokeAllSessions` | `(accessToken, { password, keepCurrent? }) => Promise<{ message, revokedCount }>` | Revoke all sessions. Requires current password. |

#### User Organization Methods (App User)

Used by app users to manage their own organizations.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listOrganizations` | `(accessToken) => Promise<{ data: OrganizationResource[] }>` | List organizations the user belongs to. |
| `createOrganization` | `(accessToken, { name, slug, imageUrl?, metadata? }) => Promise<{ data: OrganizationResource }>` | Create a new organization. |
| `getOrganization` | `(accessToken, orgId) => Promise<{ data: OrganizationResource }>` | Get organization details. |
| `updateOrganization` | `(accessToken, orgId, { name?, slug?, imageUrl?, metadata? }) => Promise<{ data: OrganizationResource }>` | Update an organization. |
| `deleteOrganization` | `(accessToken, orgId) => Promise<{ success }>` | Delete an organization. |
| `listOrgMembers` | `(accessToken, orgId) => Promise<{ data: OrganizationMemberResource[] }>` | List members of an organization. |
| `addOrgMember` | `(accessToken, orgId, { userId, role? }) => Promise<{ data: OrganizationMemberResource }>` | Add a member to an organization. |
| `updateOrgMember` | `(accessToken, orgId, memberId, { role }) => Promise<{ data: OrganizationMemberResource }>` | Update a member's role. |
| `removeOrgMember` | `(accessToken, orgId, memberId) => Promise<{ success }>` | Remove a member from an organization. |
| `createOrgInvitation` | `(accessToken, orgId, { email, role? }) => Promise<{ data: InvitationResource }>` | Invite a user to an organization. |

#### User Invitation Methods (App User)

Used by app users to manage invitations.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listInvitations` | `(accessToken) => Promise<{ data: InvitationResource[] }>` | List pending invitations for the user. |
| `sendInvitation` | `(accessToken, { email, roleId? }) => Promise<{ data: InvitationResource }>` | Send an invitation. |
| `acceptInvitation` | `(accessToken, invitationId) => Promise<{ message }>` | Accept an invitation. |
| `cancelInvitation` | `(accessToken, invitationId) => Promise<{ success }>` | Cancel a sent invitation. |
| `resendInvitation` | `(accessToken, invitationId) => Promise<{ data: InvitationResource }>` | Resend an invitation email. |

#### User Import Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `importUsers` | `({ users, environmentId, updateExisting? }) => Promise<{ data: ImportUsersResult }>` | Bulk import users. Uses publishable key auth. |

### InAIAuthError

Custom error class thrown by `InAIAuthClient` on non-2xx responses.

```ts
import { InAIAuthError } from "@inai-dev/backend";

try {
  await client.login({ email, password });
} catch (err) {
  if (err instanceof InAIAuthError) {
    console.log(err.status);    // HTTP status code (e.g., 401)
    console.log(err.code);      // Error code string (e.g., "INVALID_CREDENTIALS")
    console.log(err.body);      // { code, detail, field? }
    console.log(err.message);   // Human-readable message
  }
}
```

### Types

All types are exported from `@inai-dev/types` (and re-exported by `@inai-dev/backend`):

#### InAIAuthConfig

```ts
interface InAIAuthConfig {
  apiUrl?: string;         // default: https://apiauth.inai.dev
  publishableKey?: string; // auto-read from INAI_PUBLISHABLE_KEY env var
  tenantId?: string;
}
```

#### AuthObject

Returned by middleware `afterAuth` callback and client-side hooks. Represents the current user's auth state.

```ts
interface AuthObject {
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
```

> **Note:** `has()` uses **OR logic** — it returns `true` if the user has the specified role **or** the specified permission. If you need to check for both a role AND a permission, call `has()` twice: `has({ role: "admin" }) && has({ permission: "write" })`.

#### ServerAuthObject

Extended `AuthObject` returned by `auth()` in server components. Adds `protect()` and `redirectToSignIn()`.

```ts
interface ServerAuthObject extends AuthObject {
  protect: (params?: {
    role?: string;
    permission?: string;
    redirectTo?: string;
  }) => ProtectedAuthObject;
  redirectToSignIn: (opts?: { returnTo?: string }) => never;
}
```

#### ProtectedAuthObject

Returned by `protect()`. Guarantees the user is authenticated (`userId` and `tenantId` are non-null).

```ts
interface ProtectedAuthObject {
  userId: string;         // guaranteed non-null
  tenantId: string;       // guaranteed non-null
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
```

#### UserResource

```ts
interface UserResource {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  externalId: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### PlatformUserResource

```ts
interface PlatformUserResource {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### SessionResource

```ts
interface SessionResource {
  id: string;
  userId: string;
  tenantId: string;
  environmentId: string | null;
  activeOrgId: string | null;
  expiresAt: string;
}
```

#### OrganizationResource

```ts
interface OrganizationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
```

#### ApplicationResource

```ts
interface ApplicationResource {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  homeUrl: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  authConfig: Record<string, unknown> | null;
  environments: EnvironmentResource[];
  createdAt: string;
  updatedAt: string;
}
```

#### EnvironmentResource

```ts
interface EnvironmentResource {
  id: string;
  name: string;
  publishableKey: string;
  isActive: boolean;
}
```

#### ApplicationStats

```ts
interface ApplicationStats {
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
```

#### ApiKeyResource

```ts
interface ApiKeyResource {
  id: string;
  name: string;
  keyPrefix: string;
  keyType: string;
  environmentId: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}
```

#### JWTClaims

Structure of the JWT payload issued by the InAI Auth API.

```ts
interface JWTClaims {
  sub: string;                      // User ID
  type: "app_user" | "platform";    // Token type
  tenant_id: string;                // Tenant ID
  env_id?: string;                  // Environment ID (app_user only)
  app_id?: string;                  // Application ID (app_user only)
  email: string;
  roles: string[];
  permissions: string[];
  org_id?: string;                  // Active organization ID
  org_slug?: string;                // Active organization slug
  org_role?: string;                // User's role in the active org
  org_permissions?: string[];       // Org-scoped permissions
  external_id?: string;             // External system ID
  iat: number;                      // Issued at (Unix timestamp)
  exp: number;                      // Expires at (Unix timestamp)
}
```

#### Auth Flow Types

```ts
interface LoginParams {
  email: string;
  password: string;
}

interface LoginResult {
  mfa_required?: boolean;
  mfa_token?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface MFAChallengeParams {
  mfa_token: string;
  code: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface SignInResult {
  status: "complete" | "needs_mfa" | "error";
  mfa_token?: string;
  user?: UserResource;
  error?: string;
}

interface SignUpResult {
  status: "complete" | "needs_email_verification" | "error";
  user?: UserResource;
  error?: string;
}

interface InAIAuthErrorBody {
  code: string;
  detail: string;
  field?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## @inai-dev/nextjs (Client)

Import path: `@inai-dev/nextjs`

All exports from this path include the `"use client"` directive and can only be used in client components.

### Hooks

#### useAuth()

```ts
function useAuth(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  has: (params: { role?: string; permission?: string }) => boolean;
  signOut: () => Promise<void>;
}
```

Primary hook for auth state. `isLoaded` is `false` until the session cookie is parsed on mount.

#### useUser()

```ts
function useUser(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: UserResource | null;
}
```

Returns the full user object from the session cookie.

#### useSession()

```ts
function useSession(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  tenantId: string | null;
  orgId: string | null;
  orgRole: string | null;
}
```

Returns session metadata including organization context.

#### useOrganization()

```ts
function useOrganization(): {
  isLoaded: boolean;
  orgId: string | null;
  orgRole: string | null;
}
```

Returns the active organization context.

#### useSignIn()

```ts
function useSignIn(): {
  signIn: {
    create: (params: { identifier: string; password: string }) => Promise<SignInResult>;
    attemptMFA: (params: { code: string }) => Promise<SignInResult>;
  };
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "needs_mfa" | "complete" | "error";
  reset: () => void;
}
```

Manages the sign-in flow state machine. Call `signIn.create()` to start login. If MFA is required, `status` transitions to `"needs_mfa"` and you can call `signIn.attemptMFA()` with the TOTP code.

#### useSignUp()

```ts
function useSignUp(): {
  signUp: {
    create: (params: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<SignUpResult>;
  };
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "needs_email_verification" | "complete" | "error";
  reset: () => void;
}
```

Manages the registration flow. If email verification is required, `status` transitions to `"needs_email_verification"`.

#### useForgotPassword()

```ts
function useForgotPassword(): {
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  reset: () => void;
}
```

Sends a password reset email. Calls `POST /api/auth/forgot-password`.

```tsx
const { forgotPassword, isLoading, status, error } = useForgotPassword();

await forgotPassword("user@example.com");
// status → "success" if the email was sent
```

#### useResetPassword()

```ts
function useResetPassword(): {
  resetPassword: (params: { token: string; password: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  reset: () => void;
}
```

Resets the user's password using a token from the reset email. Calls `POST /api/auth/reset-password`.

```tsx
const { resetPassword, isLoading, status, error } = useResetPassword();

await resetPassword({ token: tokenFromUrl, password: newPassword });
// status → "success" if the password was reset
```

#### useVerifyEmail()

```ts
function useVerifyEmail(): {
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isLoading: boolean;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  reset: () => void;
}
```

Verifies an email address using a token from the verification email. Calls `POST /api/auth/verify-email`.

```tsx
const { verifyEmail, isLoading, status, error } = useVerifyEmail();

await verifyEmail(tokenFromUrl);
// status → "success" if the email was verified
```

#### useSessionTimeout()

```ts
function useSessionTimeout(options?: {
  warningBeforeMs?: number;     // default: 30 minutes (SESSION_WARNING_BEFORE_MS)
  sessionMaxDurationMs?: number; // default: 7 days (SESSION_MAX_DURATION_MS)
}): {
  showWarning: boolean;
  secondsLeft: number;
  handleLogout: () => Promise<void>;
}
```

Monitors the 7-day absolute session lifetime. Shows a warning countdown before session expiry and auto-logs out when the session reaches maximum duration. Checks every 30 seconds.

```tsx
const { showWarning, secondsLeft, handleLogout } = useSessionTimeout();

if (showWarning) {
  return <div>Session expires in {secondsLeft}s <button onClick={handleLogout}>Logout now</button></div>;
}
```

#### usePlatformAuth()

```ts
function usePlatformAuth(options?: { basePath?: string }): {
  user: PlatformUserResource | null;
  status: "idle" | "loading" | "needs_mfa" | "complete" | "error";
  error: string | null;
  isLoading: boolean;
  mfaToken: string | null;
  login: (params: { email: string; password: string }) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getMe: () => Promise<PlatformUserResource | null>;
}
```

State machine for platform (admin panel) authentication. Handles the full login flow including MFA. Default `basePath` is `"/api/platform-auth"`.

```tsx
const { login, verifyMfa, status, user, error } = usePlatformAuth();

await login({ email, password });
// If status === "needs_mfa", call verifyMfa(code)
```

#### useApplications()

```ts
function useApplications(options?: { basePath?: string }): {
  applications: ApplicationResource[];
  isLoading: boolean;
  error: string | null;
  fetchApplications: () => Promise<ApplicationResource[]>;
  createApplication: (data: { name: string; slug: string; domain?: string; homeUrl?: string }) => Promise<ApplicationResource | null>;
  updateApplication: (appId: string, data: Partial<{ name: string; domain: string | null; homeUrl: string | null; isActive: boolean }>) => Promise<ApplicationResource | null>;
  deleteApplication: (appId: string) => Promise<boolean>;
}
```

CRUD hook for managing applications in admin panels. Default `basePath` is `"/api/platform"`.

```tsx
const { applications, fetchApplications, createApplication } = useApplications();

useEffect(() => { fetchApplications(); }, []);
await createApplication({ name: "My App", slug: "my-app" });
```

#### usePlatformMembers()

```ts
function usePlatformMembers(options?: { basePath?: string }): {
  members: PlatformMemberResource[];
  invitations: PlatformInvitationResource[];
  isLoading: boolean;
  error: string | null;
  fetchMembers: () => Promise<PlatformMemberResource[]>;
  inviteMember: (data: { email: string; roleName: string; firstName?: string; lastName?: string }) => Promise<PlatformInvitationResource | null>;
  updateMember: (memberId: string, data: { roleName: string }) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  fetchInvitations: () => Promise<PlatformInvitationResource[]>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
}
```

Manages platform team members and invitations. Default `basePath` is `"/api/platform"`.

```tsx
const { members, fetchMembers, inviteMember } = usePlatformMembers();

useEffect(() => { fetchMembers(); }, []);
await inviteMember({ email: "dev@example.com", roleName: "admin" });
```

### Components

#### InAIAuthProvider

```tsx
<InAIAuthProvider>
  {children}
</InAIAuthProvider>
```

Context provider. Reads the `auth_session` cookie on mount to hydrate auth state. Must wrap all components that use auth hooks.

#### SignIn

```tsx
<SignIn
  onMFARequired?: (mfaToken: string) => void
  onSuccess?: () => void
  redirectUrl?: string
/>
```

Pre-built login form with email/password fields and automatic MFA challenge handling.

#### UserButton

```tsx
<UserButton
  afterSignOutUrl?: string
  showName?: boolean
  menuItems?: Array<{ label: string; onClick: () => void }>
  appearance?: {
    buttonSize?: number;
    buttonBg?: string;
    menuBg?: string;
    menuBorder?: string;
  }
/>
```

Avatar button with dropdown menu. Shows user initials or avatar image. Includes sign-out by default. Supports keyboard navigation (Arrow keys, Escape, Tab).

#### SignedIn

```tsx
<SignedIn>{children}</SignedIn>
```

Renders children only when the user is authenticated and loaded.

#### SignedOut

```tsx
<SignedOut>{children}</SignedOut>
```

Renders children only when the user is not authenticated (and loaded).

#### Protect

```tsx
<Protect
  role?: string
  permission?: string
  fallback?: ReactNode
>
  {children}
</Protect>
```

Renders children only when the user is authenticated and has the required role or permission. Shows `fallback` otherwise.

#### PermissionGate

```tsx
<PermissionGate
  permission?: string
  role?: string
  fallback?: ReactNode
>
  {children}
</PermissionGate>
```

Similar to Protect but does not check sign-in status first -- only checks if the user has the given permission or role.

#### OrganizationSwitcher

```tsx
<OrganizationSwitcher />
```

Dropdown that fetches organizations from `/api/organizations` and calls `/api/auth/set-active-organization` to switch. Triggers a page reload after switching.

### Cookie Constants

```ts
const COOKIE_AUTH_TOKEN = "auth_token";
const COOKIE_REFRESH_TOKEN = "refresh_token";
const COOKIE_AUTH_SESSION = "auth_session";
```

---

## @inai-dev/nextjs/server

Import path: `@inai-dev/nextjs/server`

Server-only exports. Do not import in client components.

### auth()

```ts
async function auth(): Promise<ServerAuthObject>
```

Reads JWT claims from the `auth_token` httpOnly cookie. The JWT signature was already verified by the middleware using ES256 via JWKS. See [Architecture](./architecture.md) for the layered security model.

### currentUser()

```ts
async function currentUser(opts?: { fresh?: boolean }): Promise<UserResource | null>
```

- Without `{ fresh: true }`: reads user from the `auth_session` cookie (no network request)
- With `{ fresh: true }`: calls `client.getMe()` using the access token to get up-to-date data

### createAuthRoutes()

```ts
function createAuthRoutes(config: InAIAuthConfig): {
  GET: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
  POST: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
}
```

Creates a catch-all route handler for `/api/auth/[...inai]` that handles login, register, MFA challenge, refresh, and logout for app users.

### createPlatformAuthRoutes()

```ts
function createPlatformAuthRoutes(config: InAIAuthConfig): {
  GET: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
  POST: (req: NextRequest, context: { params: Promise<{ inai: string[] }> }) => Promise<NextResponse>;
}
```

Same as `createAuthRoutes` but for platform user authentication. Uses `/api/platform/auth/*` API endpoints.

Handles the following endpoints:
- `POST /api/auth/login` — Platform user login
- `POST /api/auth/register` — Platform user + tenant registration
- `POST /api/auth/mfa-challenge` — MFA verification
- `POST /api/auth/refresh` — Token refresh
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current platform user

> **Session lifetime:** Sessions have a maximum absolute duration of 7 days from the initial login. This is enforced via the `inai_session_start` cookie, which is only set during login (not on refresh). The refresh token can only extend the access token within this 7-day window — it is not a sliding window.

### configureAuth()

```ts
function configureAuth(config: InAIAuthSDKConfig): void
```

Override default SDK configuration:

```ts
interface InAIAuthSDKConfig {
  signInUrl?: string;       // default: "/login"
  signUpUrl?: string;       // default: "/register"
  afterSignInUrl?: string;  // default: "/"
  afterSignOutUrl?: string; // default: "/login"
  apiUrl?: string;          // default: https://apiauth.inai.dev
  publishableKey?: string;  // default: from INAI_PUBLISHABLE_KEY env var
}
```

### getAuthConfig()

```ts
function getAuthConfig(): Required<InAIAuthSDKConfig>
```

Returns the resolved configuration, merging user overrides with defaults and environment variables.

---

## @inai-dev/nextjs/middleware

Import path: `@inai-dev/nextjs/middleware`

### inaiAuthMiddleware()

```ts
function inaiAuthMiddleware(config?: InAIMiddlewareConfig): (req: NextRequest) => Promise<NextResponse>
```

```ts
interface InAIMiddlewareConfig {
  publicRoutes?: string[] | ((req: NextRequest) => boolean);
  signInUrl?: string;  // default: "/login"
  beforeAuth?: (req: NextRequest) => NextResponse | void;
  afterAuth?: (auth: AuthObject, req: NextRequest) => NextResponse | void;
}
```

### withInAIAuth()

```ts
function withInAIAuth(
  wrappedMiddleware: (req: NextRequest) => NextResponse | Response | Promise<NextResponse | Response>,
  config?: InAIMiddlewareConfig,
): (req: NextRequest) => Promise<NextResponse>
```

Wraps another middleware function. Auth is resolved first, then the auth object is serialized to the `x-inai-auth` request header, and the wrapped middleware is called.

### createRouteMatcher()

```ts
function createRouteMatcher(
  patterns: (string | RegExp)[],
): (req: NextRequest) => boolean
```

Creates a function that tests a request's pathname against a list of patterns. Supports exact strings, glob-style trailing `*`, inline regex groups like `(.*)`, and full `RegExp` objects.
