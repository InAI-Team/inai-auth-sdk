"use client";

import { useContext } from "react";
import { InAIAuthContext } from "../context";

export function useUser() {
  const ctx = useContext(InAIAuthContext);
  if (!ctx)
    throw new Error(
      "useUser() requires <InAIAuthProvider> as an ancestor. Add it to your root layout.tsx.",
    );
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    user: ctx.user,
  };
}
