"use client";

import { useContext } from "react";
import { InAIAuthContext } from "../context";

export function useOrganization() {
  const ctx = useContext(InAIAuthContext);
  if (!ctx)
    throw new Error(
      "useOrganization() requires <InAIAuthProvider> as an ancestor. Add it to your root layout.tsx.",
    );
  return {
    isLoaded: ctx.isLoaded,
    orgId: ctx.orgId,
    orgRole: ctx.orgRole,
  };
}
