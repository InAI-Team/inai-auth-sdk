"use client";

import { useContext } from "react";
import { InAIAuthContext } from "../context";

export function useAuth() {
  const ctx = useContext(InAIAuthContext);
  if (!ctx)
    throw new Error(
      "useAuth() requires <InAIAuthProvider> as an ancestor. Add it to your root layout.tsx.",
    );
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    userId: ctx.userId,
    has: ctx.has,
    signOut: ctx.signOut,
  };
}
