// Re-export all React hooks, components, and providers
export {
  InAIAuthProvider,
  useAuth,
  useUser,
  useSession,
  useSessionTimeout,
  useOrganization,
  useSignIn,
  useSignUp,
  Protect,
  SignedIn,
  SignedOut,
  PermissionGate,
  UserButton,
  SignIn,
  OrganizationSwitcher,
} from "@inai-dev/react";

// Cookie constants
export {
  COOKIE_AUTH_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_AUTH_SESSION,
} from "@inai-dev/shared";

// Re-export types
export type {
  AuthObject,
  ServerAuthObject,
  ProtectedAuthObject,
  UserResource,
  PlatformUserResource,
  SessionResource,
  OrganizationResource,
  InAIAuthConfig,
  InAIAuthErrorBody,
  SignInResult,
  SignUpResult,
} from "@inai-dev/types";
