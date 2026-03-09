"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserResource } from "@inai-dev/types";
import { COOKIE_AUTH_SESSION } from "@inai-dev/shared";

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: UserResource | null;
  userId: string | null;
  tenantId: string | null;
  orgId: string | null;
  orgRole: string | null;
  roles: string[];
  permissions: string[];
}

export interface InAIAuthContextValue extends AuthState {
  has: (params: { role?: string; permission?: string }) => boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const InAIAuthContext = createContext<InAIAuthContextValue | null>(null);

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface SessionCookieData {
  user: UserResource & { tenantId?: string };
  expiresAt: string;
  permissions?: string[];
  orgId?: string;
  orgRole?: string;
  appId?: string;
  envId?: string;
}

function parseSession(): SessionCookieData | null {
  const raw = getCookie(COOKIE_AUTH_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

interface InAIAuthProviderProps {
  children: ReactNode;
}

export function InAIAuthProvider({ children }: InAIAuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    user: null,
    userId: null,
    tenantId: null,
    orgId: null,
    orgRole: null,
    roles: [],
    permissions: [],
  });

  const loadSession = useCallback(() => {
    const session = parseSession();
    if (session?.user) {
      setState({
        isLoaded: true,
        isSignedIn: true,
        user: session.user,
        userId: session.user.id,
        tenantId: session.user.tenantId ?? null,
        orgId: session.orgId ?? null,
        orgRole: session.orgRole ?? null,
        roles: session.user.roles ?? [],
        permissions: session.permissions ?? [],
      });
    } else {
      setState({
        isLoaded: true,
        isSignedIn: false,
        user: null,
        userId: null,
        tenantId: null,
        orgId: null,
        orgRole: null,
        roles: [],
        permissions: [],
      });
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const has = useCallback(
    (params: { role?: string; permission?: string }) => {
      if (params.role && state.roles.includes(params.role)) return true;
      if (params.permission && state.permissions.includes(params.permission))
        return true;
      return false;
    },
    [state.roles, state.permissions],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({
      isLoaded: true,
      isSignedIn: false,
      user: null,
      userId: null,
      tenantId: null,
      orgId: null,
      orgRole: null,
      roles: [],
      permissions: [],
    });
    window.location.href = "/login";
  }, []);

  const refreshSession = useCallback(async () => {
    await fetch("/api/auth/refresh", { method: "POST" });
    loadSession();
  }, [loadSession]);

  return (
    <InAIAuthContext.Provider
      value={{ ...state, has, signOut, refreshSession }}
    >
      {children}
    </InAIAuthContext.Provider>
  );
}
