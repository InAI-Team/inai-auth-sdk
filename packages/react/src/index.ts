// Provider
export { InAIAuthProvider } from "./context";
export type { InAIAuthContextValue } from "./context";

// Hooks
export { useAuth } from "./hooks/use-auth";
export { useUser } from "./hooks/use-user";
export { useSession } from "./hooks/use-session";
export { useOrganization } from "./hooks/use-organization";
export { useSignIn } from "./hooks/use-sign-in";
export { useSignUp } from "./hooks/use-sign-up";
export { useSessionTimeout } from "./hooks/use-session-timeout";

// Components
export { Protect } from "./components/protect";
export { SignedIn } from "./components/signed-in";
export { SignedOut } from "./components/signed-out";
export { PermissionGate } from "./components/permission-gate";
export { UserButton } from "./components/user-button";
export { SignIn } from "./components/sign-in";
export { OrganizationSwitcher } from "./components/org-switcher";

// Re-export types for convenience
export type {
  AuthObject,
  UserResource,
  OrganizationResource,
  SignInResult,
  SignUpResult,
} from "@inai-dev/types";
