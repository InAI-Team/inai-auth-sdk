"use client";

import { useState, useCallback } from "react";
import type { PlatformMemberResource, PlatformInvitationResource } from "@inai-dev/types";

export function usePlatformMembers(options?: { basePath?: string }) {
  const basePath = options?.basePath ?? "/api/platform";
  const [members, setMembers] = useState<PlatformMemberResource[]>([]);
  const [invitations, setInvitations] = useState<PlatformInvitationResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data.data);
      return data.data as PlatformMemberResource[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [basePath]);

  const inviteMember = useCallback(
    async (data: { email: string; roleName: string; firstName?: string; lastName?: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/members/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to invite member");
        }
        const result = await res.json();
        return result.data as PlatformInvitationResource;
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

  const updateMember = useCallback(
    async (memberId: string, data: { roleName: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update member");
        const result = await res.json();
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, roles: result.data.roles } : m)),
        );
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

  const removeMember = useCallback(
    async (memberId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/members/${memberId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove member");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
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

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/members/invitations`);
      if (!res.ok) throw new Error("Failed to fetch invitations");
      const data = await res.json();
      setInvitations(data.data);
      return data.data as PlatformInvitationResource[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [basePath]);

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/members/invitations/${invitationId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to cancel invitation");
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
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
    members,
    invitations,
    isLoading,
    error,
    fetchMembers,
    inviteMember,
    updateMember,
    removeMember,
    fetchInvitations,
    cancelInvitation,
  };
}
