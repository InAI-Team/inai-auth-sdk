"use client";

import type { ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";

interface SignedInProps {
  children: ReactNode;
}

export function SignedIn({ children }: SignedInProps) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}
