"use client";

import type { ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";

interface PermissionGateProps {
  permission?: string;
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  role,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { has, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!has({ permission, role })) return <>{fallback}</>;
  return <>{children}</>;
}
