"use client";

import { useState, useCallback } from "react";
import type { ApplicationResource } from "@inai-dev/types";

export function useApplications(options?: { basePath?: string }) {
  const basePath = options?.basePath ?? "/api/platform";
  const [applications, setApplications] = useState<ApplicationResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/applications`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.data);
      return data.data as ApplicationResource[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [basePath]);

  const createApplication = useCallback(
    async (appData: {
      name: string;
      slug: string;
      domain?: string;
      homeUrl?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/applications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appData),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create application");
        }
        const data = await res.json();
        setApplications((prev) => [...prev, data.data]);
        return data.data as ApplicationResource;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [basePath],
  );

  const updateApplication = useCallback(
    async (
      appId: string,
      appData: Partial<{
        name: string;
        domain: string | null;
        homeUrl: string | null;
        isActive: boolean;
      }>,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/applications/${appId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appData),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to update application");
        }
        const data = await res.json();
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? data.data : a)),
        );
        return data.data as ApplicationResource;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [basePath],
  );

  const deleteApplication = useCallback(
    async (appId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/applications/${appId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete application");
        setApplications((prev) => prev.filter((a) => a.id !== appId));
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [basePath],
  );

  return {
    applications,
    isLoading,
    error,
    fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
  };
}
