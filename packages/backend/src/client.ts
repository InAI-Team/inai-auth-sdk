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
  PaginatedResult,
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
  }): Promise<LoginResult & { user?: UserResource }> {
    return this.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async mfaChallenge(params: MFAChallengeParams): Promise<TokenPair> {
    return this.request<TokenPair>("/api/v1/auth/mfa/challenge", {
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

  // --- Platform Auth ---

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

  async platformLogout(refreshToken: string): Promise<void> {
    await this.request("/api/platform/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
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

  async listApplications(
    accessToken: string,
  ): Promise<{ data: ApplicationResource[] }> {
    return this.platformRequest("/api/platform/applications", accessToken);
  }

  async createApplication(
    accessToken: string,
    data: { name: string; slug: string; domain?: string; homeUrl?: string },
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
}
