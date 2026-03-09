import type { ApplicationResource, ApplicationStats } from "@inai-dev/types";

export interface ApplicationsAPI {
  listApplications(
    accessToken: string,
  ): Promise<{ data: ApplicationResource[] }>;
  createApplication(
    accessToken: string,
    data: { name: string; slug: string; domain?: string; homeUrl?: string },
  ): Promise<{ data: ApplicationResource }>;
  getApplication(
    accessToken: string,
    appId: string,
  ): Promise<{ data: ApplicationResource }>;
  updateApplication(
    accessToken: string,
    appId: string,
    data: Partial<{
      name: string;
      domain: string | null;
      homeUrl: string | null;
      isActive: boolean;
    }>,
  ): Promise<{ data: ApplicationResource }>;
  getApplicationStats(
    accessToken: string,
    appId: string,
  ): Promise<{ data: ApplicationStats }>;
}
