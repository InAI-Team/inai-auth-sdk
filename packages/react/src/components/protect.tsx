"use client";

import type { ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";

interface ProtectProps {
  role?: string;
  permission?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Protect({
  role,
  permission,
  fallback = null,
  children,
}: ProtectProps) {
  const { isLoaded, isSignedIn, has } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <>{fallback}</>;
  if ((role || permission) && !has({ role, permission })) return <>{fallback}</>;
  return <>{children}</>;
}
