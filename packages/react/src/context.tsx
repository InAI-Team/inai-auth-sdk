"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { UserResource } from "@inai-dev/types";
import {
  COOKIE_AUTH_SESSION,
  COOKIE_SESSION_START,
  SESSION_MAX_DURATION_MS,
  SESSION_WARNING_BEFORE_MS,
  PROACTIVE_REFRESH_BEFORE_MS,
  REFRESH_CHECK_INTERVAL_MS,
} from "@inai-dev/shared";

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
  autoRefresh?: boolean;
  sessionMaxDurationMs?: number;
  sessionWarningBeforeMs?: number;
  onSessionExpiring?: (secondsLeft: number) => void;
  onSessionExpired?: () => void;
}

export function InAIAuthProvider({
  children,
  autoRefresh = true,
  sessionMaxDurationMs = SESSION_MAX_DURATION_MS,
  sessionWarningBeforeMs = SESSION_WARNING_BEFORE_MS,
  onSessionExpiring,
  onSessionExpired,
}: InAIAuthProviderProps) {
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

  // Auto-refresh & session timeout logic
  const proactiveRefreshingRef = useRef(false);
  const warningFiredRef = useRef(false);
  const expiredFiredRef = useRef(false);

  useEffect(() => {
    if (!autoRefresh) return;
    warningFiredRef.current = false;
    expiredFiredRef.current = false;

    const check = async () => {
      if (!state.isSignedIn) return;

      // Check access token expiry for proactive refresh
      const session = parseSession();
      if (session?.expiresAt) {
        const expiresAt = typeof session.expiresAt === "string"
          ? new Date(session.expiresAt).getTime()
          : session.expiresAt;
        const msLeftToken = expiresAt - Date.now();
        if (msLeftToken <= PROACTIVE_REFRESH_BEFORE_MS && !proactiveRefreshingRef.current) {
          proactiveRefreshingRef.current = true;
          await fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
          loadSession();
          proactiveRefreshingRef.current = false;
        }
      }

      // Check absolute session deadline
      const sessionStartRaw = getCookie(COOKIE_SESSION_START);
      if (sessionStartRaw) {
        const loginAt = Number(sessionStartRaw);
        if (!isNaN(loginAt)) {
          const deadline = loginAt + sessionMaxDurationMs;
          const msLeft = deadline - Date.now();

          if (msLeft <= 0 && !expiredFiredRef.current) {
            expiredFiredRef.current = true;
            if (onSessionExpired) {
              onSessionExpired();
            } else {
              await signOut();
            }
            return;
          }

          if (msLeft <= sessionWarningBeforeMs && onSessionExpiring && !warningFiredRef.current) {
            warningFiredRef.current = true;
            onSessionExpiring(Math.floor(msLeft / 1000));
          }
        }
      }
    };

    check();
    const interval = setInterval(check, REFRESH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, state.isSignedIn, sessionMaxDurationMs, sessionWarningBeforeMs, onSessionExpiring, onSessionExpired, signOut, loadSession]);

  return (
    <InAIAuthContext.Provider
      value={{ ...state, has, signOut, refreshSession }}
    >
      {children}
    </InAIAuthContext.Provider>
  );
}
