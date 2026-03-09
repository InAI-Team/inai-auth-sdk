"use client";

import { useContext } from "react";
import { InAIAuthContext } from "../context";

export function useSession() {
  const ctx = useContext(InAIAuthContext);
  if (!ctx)
    throw new Error(
      "useSession() requires <InAIAuthProvider> as an ancestor. Add it to your root layout.tsx.",
    );
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    orgId: ctx.orgId,
    orgRole: ctx.orgRole,
  };
}
