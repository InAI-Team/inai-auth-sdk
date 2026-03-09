import type { UserResource, PaginatedResult } from "@inai-dev/types";

export interface UsersAPI {
  listAppUsers(
    accessToken: string,
    appId: string,
    params?: { environmentId?: string; page?: number; limit?: number },
  ): Promise<PaginatedResult<UserResource>>;
  createAppUser(
    accessToken: string,
    appId: string,
    data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      environmentId: string;
    },
  ): Promise<{ data: UserResource }>;
}
