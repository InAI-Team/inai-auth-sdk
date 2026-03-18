import type {
  InAIAuthConfig,
  LoginParams,
  LoginResult,
  MFAChallengeParams,
  TokenPair,
  UserResource,
  PlatformUserResource,
  ApplicationResource,
  ApplicationStats,
  ApiKeyResource,
  RoleResource,
  PermissionResource,
  PlatformMemberResource,
  PlatformInvitationResource,
  PaginatedResult,
  WebhookResource,
  EmailTemplateResource,
  AuditLogResource,
  AppSessionResource,
  OrganizationResource,
  OrganizationMemberResource,
  InvitationResource,
  MfaSetupResponse,
  BackupCodesResponse,
  ImportUsersResult,
} from "@inai-dev/types";
import { InAIAuthError, HEADER_PUBLISHABLE_KEY, DEFAULT_API_URL } from "@inai-dev/shared";

export class InAIAuthClient {
  private apiUrl: string;
  private publishableKey: string;
  private tenantId?: string;

  constructor(config: InAIAuthConfig = {}) {
    this.apiUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
    this.publishableKey =
      config.publishableKey ??
      (typeof process !== "undefined" ? process.env?.INAI_PUBLISHABLE_KEY : undefined) ??
      "";
    this.tenantId = config.tenantId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (path.startsWith("/api/v1/")) {
      headers[HEADER_PUBLISHABLE_KEY] = this.publishableKey;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new InAIAuthError(
        (body as Record<string, string>).detail ||
          `Request failed: ${res.status}`,
        res.status,
        body,
      );
    }

    return res.json() as Promise<T>;
  }

  // --- App User Auth (v1) ---

  async login(params: LoginParams): Promise<LoginResult> {
    return this.request<LoginResult>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async register(params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<LoginResult> {
    return this.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async mfaChallenge(params: MFAChallengeParams): Promise<TokenPair & { user?: UserResource }> {
    return this.request<TokenPair & { user?: UserResource }>("/api/v1/auth/mfa/challenge", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.request<TokenPair>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.request("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getMe(accessToken: string): Promise<{ data: UserResource }> {
    return this.request<{ data: UserResource }>("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async setActiveOrganization(
    accessToken: string,
    organizationId: string | null,
  ): Promise<TokenPair> {
    return this.request<TokenPair>("/api/v1/auth/set-active-organization", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ organizationId }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    return this.request("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.request("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  // --- OAuth ---

  getOAuthInitUrl(
    provider: "github" | "google" | "instagram",
    redirectUri: string,
  ): string {
    const params = new URLSearchParams({ redirect_uri: redirectUri });
    if (this.tenantId) params.set("tenant_id", this.tenantId);
    return `${this.apiUrl}/api/v1/auth/oauth/${provider}?${params.toString()}`;
  }

  // --- Platform Auth ---

  async platformRegister(params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    tenantName: string;
    tenantSlug: string;
  }): Promise<LoginResult & { user?: PlatformUserResource; tenant?: { id: string; name: string; slug: string } }> {
    return this.request("/api/platform/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async platformLogin(
    params: LoginParams,
  ): Promise<LoginResult & { user?: PlatformUserResource }> {
    return this.request("/api/platform/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async platformRefresh(refreshToken: string): Promise<TokenPair> {
    return this.request<TokenPair>("/api/platform/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async platformLogout(accessToken: string): Promise<void> {
    await this.platformRequest("/api/platform/auth/logout", accessToken, {
      method: "POST",
    });
  }

  async platformMfaChallenge(
    params: MFAChallengeParams,
  ): Promise<TokenPair & { user?: PlatformUserResource }> {
    return this.request("/api/platform/auth/mfa/challenge", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async platformGetMe(
    accessToken: string,
  ): Promise<{ data: PlatformUserResource }> {
    return this.platformRequest("/api/platform/auth/me", accessToken);
  }

  // --- Platform Management ---

  private platformRequest<T>(
    path: string,
    accessToken: string,
    options: RequestInit = {},
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...((options.headers as Record<string, string>) || {}),
      },
    });
  }

  private appUserRequest<T>(
    path: string,
    accessToken: string,
    options: RequestInit = {},
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...((options.headers as Record<string, string>) || {}),
      },
    });
  }

  async listApplications(
    accessToken: string,
  ): Promise<{ data: ApplicationResource[] }> {
    return this.platformRequest("/api/platform/applications", accessToken);
  }

  async createApplication(
    accessToken: string,
    data: {
      name: string;
      slug: string;
      domain?: string;
      homeUrl?: string;
      callbackUrls?: string[];
      settings?: Record<string, unknown>;
      authConfig?: Record<string, unknown>;
    },
  ): Promise<{ data: ApplicationResource }> {
    return this.platformRequest("/api/platform/applications", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getApplication(
    accessToken: string,
    appId: string,
  ): Promise<{ data: ApplicationResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}`,
      accessToken,
    );
  }

  async updateApplication(
    accessToken: string,
    appId: string,
    data: Partial<{
      name: string;
      domain: string | null;
      homeUrl: string | null;
      callbackUrls: string[] | null;
      settings: Record<string, unknown> | null;
      authConfig: Record<string, unknown> | null;
      isActive: boolean;
    }>,
  ): Promise<{ data: ApplicationResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteApplication(
    accessToken: string,
    appId: string,
  ): Promise<void> {
    await this.platformRequest(
      `/api/platform/applications/${appId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async getApplicationStats(
    accessToken: string,
    appId: string,
  ): Promise<{ data: ApplicationStats }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/stats`,
      accessToken,
    );
  }

  async listAppUsers(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string; page?: number; limit?: number },
  ): Promise<PaginatedResult<UserResource>> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/users${query}`,
      accessToken,
    );
  }

  async createAppUser(
    accessToken: string,
    appId: string,
    data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      environmentId: string;
    },
  ): Promise<{ data: UserResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/users`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async listAppApiKeys(
    accessToken: string,
    appId: string,
    environmentId?: string,
  ): Promise<{ data: ApiKeyResource[] }> {
    const qs = environmentId ? `?environmentId=${environmentId}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/api-keys${qs}`,
      accessToken,
    );
  }

  async createAppApiKey(
    accessToken: string,
    appId: string,
    name: string,
    environmentId: string,
  ): Promise<{ data: ApiKeyResource & { key: string } }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/api-keys`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ name, environmentId }),
      },
    );
  }

  async revokeAppApiKey(
    accessToken: string,
    appId: string,
    keyId: string,
  ): Promise<void> {
    await this.platformRequest(
      `/api/platform/applications/${appId}/api-keys/${keyId}`,
      accessToken,
      {
        method: "DELETE",
      },
    );
  }

  async rotateAppKeys(
    accessToken: string,
    appId: string,
    environmentId: string,
  ): Promise<{ publishableKey: string }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/rotate-keys`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ environmentId }),
      },
    );
  }

  // --- App User Management ---

  async getAppUser(
    accessToken: string,
    appId: string,
    userId: string,
  ): Promise<{ data: UserResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/users/${userId}`,
      accessToken,
    );
  }

  async updateAppUser(
    accessToken: string,
    appId: string,
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      isActive: boolean;
    }>,
  ): Promise<{ data: UserResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/users/${userId}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  async assignAppUserRoles(
    accessToken: string,
    appId: string,
    userId: string,
    roleIds: string[],
  ): Promise<{ data: { userId: string; roles: Array<{ id: string; name: string; description: string | null }> } }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/users/${userId}/roles`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ roleIds }),
      },
    );
  }

  // --- App Role Management ---

  async listAppRoles(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string },
  ): Promise<{ data: RoleResource[] }> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles${query}`,
      accessToken,
    );
  }

  async createAppRole(
    accessToken: string,
    appId: string,
    data: {
      name: string;
      description?: string | null;
      environmentId?: string;
      hierarchyLevel?: number;
    },
  ): Promise<{ data: RoleResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async getAppRole(
    accessToken: string,
    appId: string,
    roleId: string,
  ): Promise<{ data: RoleResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles/${roleId}`,
      accessToken,
    );
  }

  async updateAppRole(
    accessToken: string,
    appId: string,
    roleId: string,
    data: Partial<{
      name: string;
      description: string | null;
    }>,
  ): Promise<{ data: RoleResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles/${roleId}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteAppRole(
    accessToken: string,
    appId: string,
    roleId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles/${roleId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async getAppRolePermissions(
    accessToken: string,
    appId: string,
    roleId: string,
  ): Promise<{ data: PermissionResource[] }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles/${roleId}/permissions`,
      accessToken,
    );
  }

  async assignAppRolePermissions(
    accessToken: string,
    appId: string,
    roleId: string,
    permissionIds: string[],
  ): Promise<{ data: { assigned: number; skipped: number } }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles/${roleId}/permissions`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ permissionIds }),
      },
    );
  }

  async removeAppRolePermission(
    accessToken: string,
    appId: string,
    roleId: string,
    permissionId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/roles/${roleId}/permissions/${permissionId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- App Permission Management ---

  async listAppPermissions(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string },
  ): Promise<{ data: PermissionResource[] }> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/permissions${query}`,
      accessToken,
    );
  }

  async createAppPermission(
    accessToken: string,
    appId: string,
    data: {
      name: string;
      description?: string | null;
      resource: string;
      action: string;
      environmentId?: string;
    },
  ): Promise<{ data: PermissionResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/permissions`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteAppPermission(
    accessToken: string,
    appId: string,
    permissionId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/permissions/${permissionId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- Platform Members ---

  async listPlatformMembers(
    accessToken: string,
  ): Promise<{ data: PlatformMemberResource[] }> {
    return this.platformRequest("/api/platform/members", accessToken);
  }

  async invitePlatformMember(
    accessToken: string,
    data: {
      email: string;
      roleName: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<{ data: PlatformInvitationResource; message: string }> {
    return this.platformRequest("/api/platform/members/invite", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePlatformMember(
    accessToken: string,
    memberId: string,
    data: { roleName: string },
  ): Promise<{ data: { id: string; email: string; roles: string[] } }> {
    return this.platformRequest(
      `/api/platform/members/${memberId}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  async removePlatformMember(
    accessToken: string,
    memberId: string,
  ): Promise<{ message: string }> {
    return this.platformRequest(
      `/api/platform/members/${memberId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async listPlatformInvitations(
    accessToken: string,
  ): Promise<{ data: PlatformInvitationResource[] }> {
    return this.platformRequest(
      "/api/platform/members/invitations",
      accessToken,
    );
  }

  async cancelPlatformInvitation(
    accessToken: string,
    invitationId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/members/invitations/${invitationId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async resendPlatformInvitation(
    accessToken: string,
    invitationId: string,
  ): Promise<{ data: PlatformInvitationResource }> {
    return this.platformRequest(
      `/api/platform/members/invitations/${invitationId}/resend`,
      accessToken,
      { method: "POST" },
    );
  }

  async acceptPlatformInvitation(
    invitationId: string,
    data: { password: string; firstName?: string; lastName?: string },
  ): Promise<{ message: string }> {
    return this.request(`/api/platform/members/invite/${invitationId}/accept`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- App Sessions ---

  async listAppSessions(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string; page?: number; limit?: number },
  ): Promise<PaginatedResult<AppSessionResource>> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/sessions${query}`,
      accessToken,
    );
  }

  async revokeAppSession(
    accessToken: string,
    appId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/sessions/${sessionId}/revoke`,
      accessToken,
      { method: "POST" },
    );
  }

  // --- App Audit Logs ---

  async listAppAuditLogs(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string; page?: number; limit?: number; action?: string },
  ): Promise<PaginatedResult<AuditLogResource>> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.action) qs.set("action", params.action);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/audit-logs${query}`,
      accessToken,
    );
  }

  // --- App Invitations ---

  async listAppInvitations(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string },
  ): Promise<{ data: InvitationResource[] }> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/invitations${query}`,
      accessToken,
    );
  }

  async createAppInvitation(
    accessToken: string,
    appId: string,
    data: { email: string; roleId?: string; environmentId: string },
  ): Promise<{ data: InvitationResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/invitations`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async resendAppInvitation(
    accessToken: string,
    appId: string,
    invitationId: string,
  ): Promise<{ data: InvitationResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/invitations/${invitationId}/resend`,
      accessToken,
      { method: "POST" },
    );
  }

  async cancelAppInvitation(
    accessToken: string,
    appId: string,
    invitationId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/invitations/${invitationId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- App Organizations ---

  async listAppOrganizations(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string; page?: number; limit?: number },
  ): Promise<PaginatedResult<OrganizationResource>> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/organizations${query}`,
      accessToken,
    );
  }

  async createAppOrganization(
    accessToken: string,
    appId: string,
    data: { name: string; slug: string; environmentId: string; imageUrl?: string; metadata?: unknown },
  ): Promise<{ data: OrganizationResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/organizations`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateAppOrganization(
    accessToken: string,
    appId: string,
    orgId: string,
    data: Partial<{ name: string; slug: string; imageUrl: string | null; metadata: unknown }>,
  ): Promise<{ data: OrganizationResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/organizations/${orgId}`,
      accessToken,
      { method: "PUT", body: JSON.stringify(data) },
    );
  }

  async deleteAppOrganization(
    accessToken: string,
    appId: string,
    orgId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/organizations/${orgId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- App Webhooks ---

  async listAppWebhooks(
    accessToken: string,
    appId: string,
  ): Promise<{ data: WebhookResource[] }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/webhooks`,
      accessToken,
    );
  }

  async createAppWebhook(
    accessToken: string,
    appId: string,
    data: { url: string; events: string[]; environmentId?: string },
  ): Promise<{ data: WebhookResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/webhooks`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async deleteAppWebhook(
    accessToken: string,
    appId: string,
    webhookId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/webhooks/${webhookId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- App Email Templates ---

  async listAppEmailTemplates(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string },
  ): Promise<{ data: EmailTemplateResource[] }> {
    const qs = new URLSearchParams();
    if (params?.environmentId) qs.set("environmentId", params.environmentId);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/applications/${appId}/email-templates${query}`,
      accessToken,
    );
  }

  async createAppEmailTemplate(
    accessToken: string,
    appId: string,
    data: {
      name: string;
      subject: string;
      htmlBody: string;
      textBody?: string;
      environmentId: string;
      variables?: string[];
    },
  ): Promise<{ data: EmailTemplateResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/email-templates`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateAppEmailTemplate(
    accessToken: string,
    appId: string,
    templateId: string,
    data: Partial<{
      name: string;
      subject: string;
      htmlBody: string;
      textBody: string | null;
      variables: string[];
      isActive: boolean;
    }>,
  ): Promise<{ data: EmailTemplateResource }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/email-templates/${templateId}`,
      accessToken,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async previewAppEmailTemplate(
    accessToken: string,
    appId: string,
    templateId: string,
  ): Promise<{ html: string; text: string | null }> {
    return this.platformRequest(
      `/api/platform/applications/${appId}/email-templates/${templateId}/preview`,
      accessToken,
    );
  }

  // --- Platform API Keys ---

  async listPlatformApiKeys(
    accessToken: string,
  ): Promise<{ data: ApiKeyResource[] }> {
    return this.platformRequest("/api/platform/api-keys", accessToken);
  }

  async createPlatformApiKey(
    accessToken: string,
    data: { name: string },
  ): Promise<{ data: ApiKeyResource & { key: string } }> {
    return this.platformRequest("/api/platform/api-keys", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async revokePlatformApiKey(
    accessToken: string,
    keyId: string,
  ): Promise<void> {
    await this.platformRequest(
      `/api/platform/api-keys/${keyId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- Platform Webhooks ---

  async listPlatformWebhooks(
    accessToken: string,
  ): Promise<{ data: WebhookResource[] }> {
    return this.platformRequest("/api/platform/webhooks", accessToken);
  }

  async createPlatformWebhook(
    accessToken: string,
    data: { url: string; events: string[] },
  ): Promise<{ data: WebhookResource }> {
    return this.platformRequest("/api/platform/webhooks", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deletePlatformWebhook(
    accessToken: string,
    webhookId: string,
  ): Promise<{ success: boolean }> {
    return this.platformRequest(
      `/api/platform/webhooks/${webhookId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  // --- Platform Email Templates ---

  async listPlatformEmailTemplates(
    accessToken: string,
  ): Promise<{ data: EmailTemplateResource[] }> {
    return this.platformRequest("/api/platform/email-templates", accessToken);
  }

  async updatePlatformEmailTemplate(
    accessToken: string,
    templateId: string,
    data: Partial<{
      subject: string;
      htmlBody: string;
      textBody: string | null;
      isActive: boolean;
    }>,
  ): Promise<{ data: EmailTemplateResource }> {
    return this.platformRequest(
      `/api/platform/email-templates/${templateId}`,
      accessToken,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async previewPlatformEmailTemplate(
    accessToken: string,
    templateId: string,
  ): Promise<{ html: string; text: string | null }> {
    return this.platformRequest(
      `/api/platform/email-templates/${templateId}/preview`,
      accessToken,
    );
  }

  async initializeEmailTemplates(
    accessToken: string,
  ): Promise<{ data: EmailTemplateResource[]; message: string }> {
    return this.platformRequest("/api/platform/email-templates/initialize", accessToken, {
      method: "POST",
    });
  }

  // --- Platform Audit Logs ---

  async listPlatformAuditLogs(
    accessToken: string,
    params?: { page?: number; limit?: number; action?: string },
  ): Promise<PaginatedResult<AuditLogResource>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.action) qs.set("action", params.action);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.platformRequest(
      `/api/platform/audit-logs${query}`,
      accessToken,
    );
  }

  // --- Platform Settings ---

  async updatePlatformSettings(
    accessToken: string,
    data: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> }> {
    return this.platformRequest("/api/platform/settings", accessToken, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // --- MFA Management (App User) ---

  async enableMfa(
    accessToken: string,
  ): Promise<{ data: MfaSetupResponse }> {
    return this.appUserRequest("/api/v1/auth/mfa/enable", accessToken, {
      method: "POST",
    });
  }

  async verifyMfaSetup(
    accessToken: string,
    code: string,
  ): Promise<{ data: BackupCodesResponse }> {
    return this.appUserRequest("/api/v1/auth/mfa/verify", accessToken, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async disableMfa(
    accessToken: string,
    code: string,
  ): Promise<{ message: string }> {
    return this.appUserRequest("/api/v1/auth/mfa/disable", accessToken, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async generateBackupCodes(
    accessToken: string,
  ): Promise<{ data: BackupCodesResponse }> {
    return this.appUserRequest("/api/v1/auth/mfa/backup-codes", accessToken, {
      method: "POST",
    });
  }

  async verifyBackupCode(
    accessToken: string,
    code: string,
  ): Promise<{ message: string }> {
    return this.appUserRequest("/api/v1/auth/mfa/backup-code/verify", accessToken, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async getRemainingBackupCodes(
    accessToken: string,
  ): Promise<{ data: { remaining: number } }> {
    return this.appUserRequest("/api/v1/auth/mfa/remaining", accessToken);
  }

  // --- User Sessions (App User) ---

  async listSessions(
    accessToken: string,
  ): Promise<{ data: AppSessionResource[] }> {
    return this.appUserRequest("/api/v1/sessions", accessToken);
  }

  async revokeSession(
    accessToken: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    return this.appUserRequest(
      `/api/v1/sessions/${sessionId}/revoke`,
      accessToken,
      { method: "POST" },
    );
  }

  async revokeAllSessions(
    accessToken: string,
    data: { password: string; keepCurrent?: boolean },
  ): Promise<{ message: string; revokedCount: number }> {
    return this.appUserRequest("/api/v1/sessions/revoke-all", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Organizations (App User v1) ---

  async listOrganizations(
    accessToken: string,
  ): Promise<{ data: OrganizationResource[] }> {
    return this.appUserRequest("/api/v1/organizations", accessToken);
  }

  async createOrganization(
    accessToken: string,
    data: { name: string; slug: string; imageUrl?: string; metadata?: unknown },
  ): Promise<{ data: OrganizationResource }> {
    return this.appUserRequest("/api/v1/organizations", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getOrganization(
    accessToken: string,
    orgId: string,
  ): Promise<{ data: OrganizationResource }> {
    return this.appUserRequest(`/api/v1/organizations/${orgId}`, accessToken);
  }

  async updateOrganization(
    accessToken: string,
    orgId: string,
    data: Partial<{ name: string; slug: string; imageUrl: string | null; metadata: unknown }>,
  ): Promise<{ data: OrganizationResource }> {
    return this.appUserRequest(`/api/v1/organizations/${orgId}`, accessToken, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(
    accessToken: string,
    orgId: string,
  ): Promise<{ success: boolean }> {
    return this.appUserRequest(`/api/v1/organizations/${orgId}`, accessToken, {
      method: "DELETE",
    });
  }

  async listOrgMembers(
    accessToken: string,
    orgId: string,
  ): Promise<{ data: OrganizationMemberResource[] }> {
    return this.appUserRequest(
      `/api/v1/organizations/${orgId}/members`,
      accessToken,
    );
  }

  async addOrgMember(
    accessToken: string,
    orgId: string,
    data: { userId: string; role?: string },
  ): Promise<{ data: OrganizationMemberResource }> {
    return this.appUserRequest(
      `/api/v1/organizations/${orgId}/members`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateOrgMember(
    accessToken: string,
    orgId: string,
    memberId: string,
    data: { role: string },
  ): Promise<{ data: OrganizationMemberResource }> {
    return this.appUserRequest(
      `/api/v1/organizations/${orgId}/members/${memberId}`,
      accessToken,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async removeOrgMember(
    accessToken: string,
    orgId: string,
    memberId: string,
  ): Promise<{ success: boolean }> {
    return this.appUserRequest(
      `/api/v1/organizations/${orgId}/members/${memberId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async createOrgInvitation(
    accessToken: string,
    orgId: string,
    data: { email: string; role?: string },
  ): Promise<{ data: InvitationResource }> {
    return this.appUserRequest(
      `/api/v1/organizations/${orgId}/invitations`,
      accessToken,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  // --- Invitations (App User v1) ---

  async listInvitations(
    accessToken: string,
  ): Promise<{ data: InvitationResource[] }> {
    return this.appUserRequest("/api/v1/invitations", accessToken);
  }

  async sendInvitation(
    accessToken: string,
    data: { email: string; roleId?: string },
  ): Promise<{ data: InvitationResource }> {
    return this.appUserRequest("/api/v1/invitations", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async acceptInvitation(
    accessToken: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    return this.appUserRequest(
      `/api/v1/invitations/${invitationId}/accept`,
      accessToken,
      { method: "POST" },
    );
  }

  async cancelInvitation(
    accessToken: string,
    invitationId: string,
  ): Promise<{ success: boolean }> {
    return this.appUserRequest(
      `/api/v1/invitations/${invitationId}`,
      accessToken,
      { method: "DELETE" },
    );
  }

  async resendInvitation(
    accessToken: string,
    invitationId: string,
  ): Promise<{ data: InvitationResource }> {
    return this.appUserRequest(
      `/api/v1/invitations/${invitationId}/resend`,
      accessToken,
      { method: "POST" },
    );
  }

  // --- User Import ---

  async importUsers(
    data: {
      users: Array<{
        email: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        roles?: string[];
      }>;
      environmentId: string;
      updateExisting?: boolean;
    },
  ): Promise<{ data: ImportUsersResult }> {
    return this.request("/api/v1/import/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- V1 Users ---

  async listUsers(
    accessToken: string,
    params?: { page?: number; limit?: number; search?: string },
  ): Promise<PaginatedResult<UserResource>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.appUserRequest(`/api/v1/users${query}`, accessToken);
  }

  async createUser(
    accessToken: string,
    data: { email: string; password: string; firstName?: string; lastName?: string },
  ): Promise<{ data: UserResource }> {
    return this.appUserRequest("/api/v1/users", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getUser(
    accessToken: string,
    userId: string,
  ): Promise<{ data: UserResource }> {
    return this.appUserRequest(`/api/v1/users/${userId}`, accessToken);
  }

  async getUserByExternalId(
    accessToken: string,
    externalId: string,
  ): Promise<{ data: UserResource }> {
    return this.appUserRequest(`/api/v1/import/users/${externalId}`, accessToken);
  }

  async updateUser(
    accessToken: string,
    userId: string,
    data: Partial<{ firstName: string; lastName: string; isActive: boolean }>,
  ): Promise<{ data: UserResource }> {
    return this.appUserRequest(`/api/v1/users/${userId}`, accessToken, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async assignUserRoles(
    accessToken: string,
    userId: string,
    roleIds: string[],
  ): Promise<{ data: { userId: string; roles: Array<{ id: string; name: string }> } }> {
    return this.appUserRequest(`/api/v1/users/${userId}/roles`, accessToken, {
      method: "POST",
      body: JSON.stringify({ roleIds }),
    });
  }

  // --- V1 Roles ---

  async listRoles(
    accessToken: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: RoleResource[] }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.appUserRequest(`/api/v1/roles${query}`, accessToken);
  }

  async createRole(
    accessToken: string,
    data: { name: string; description?: string; hierarchyLevel?: number },
  ): Promise<{ data: RoleResource }> {
    return this.appUserRequest("/api/v1/roles", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getRole(
    accessToken: string,
    roleId: string,
  ): Promise<{ data: RoleResource }> {
    return this.appUserRequest(`/api/v1/roles/${roleId}`, accessToken);
  }

  async updateRole(
    accessToken: string,
    roleId: string,
    data: Partial<{ name: string; description: string }>,
  ): Promise<{ data: RoleResource }> {
    return this.appUserRequest(`/api/v1/roles/${roleId}`, accessToken, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteRole(
    accessToken: string,
    roleId: string,
  ): Promise<{ success: boolean }> {
    return this.appUserRequest(`/api/v1/roles/${roleId}`, accessToken, {
      method: "DELETE",
    });
  }

  // --- V1 Role Permissions ---

  async getRolePermissions(
    accessToken: string,
    roleId: string,
  ): Promise<{ data: PermissionResource[] }> {
    return this.appUserRequest(`/api/v1/roles/${roleId}/permissions`, accessToken);
  }

  async assignRolePermissions(
    accessToken: string,
    roleId: string,
    permissionIds: string[],
  ): Promise<{ data: { assigned: number; skipped: number } }> {
    return this.appUserRequest(`/api/v1/roles/${roleId}/permissions`, accessToken, {
      method: "POST",
      body: JSON.stringify({ permissionIds }),
    });
  }

  async removeRolePermission(
    accessToken: string,
    roleId: string,
    permissionId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.appUserRequest(`/api/v1/roles/${roleId}/permissions/${permissionId}`, accessToken, {
      method: "DELETE",
    });
  }

  // --- V1 Permissions ---

  async listPermissions(
    accessToken: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: PermissionResource[] }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.appUserRequest(`/api/v1/permissions${query}`, accessToken);
  }

  async createPermission(
    accessToken: string,
    data: { name: string; description?: string; resource: string; action: string },
  ): Promise<{ data: PermissionResource }> {
    return this.appUserRequest("/api/v1/permissions", accessToken, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deletePermission(
    accessToken: string,
    permissionId: string,
  ): Promise<{ success: boolean }> {
    return this.appUserRequest(`/api/v1/permissions/${permissionId}`, accessToken, {
      method: "DELETE",
    });
  }
}
