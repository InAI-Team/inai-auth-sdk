import type { InAIAuthSDKConfig } from "@inai-dev/types";
import { DEFAULT_API_URL } from "@inai-dev/shared";

type ResolvedConfig = Required<InAIAuthSDKConfig>;

const defaults: ResolvedConfig = {
  signInUrl: "/login",
  signUpUrl: "/register",
  afterSignInUrl: "/",
  afterSignOutUrl: "/login",
  apiUrl: DEFAULT_API_URL,
  publishableKey: "",
};

let userConfig: Partial<InAIAuthSDKConfig> = {};

export function configureAuth(config: InAIAuthSDKConfig): void {
  userConfig = config;
}

export function getAuthConfig(): ResolvedConfig {
  return {
    signInUrl: userConfig.signInUrl ?? defaults.signInUrl,
    signUpUrl: userConfig.signUpUrl ?? defaults.signUpUrl,
    afterSignInUrl: userConfig.afterSignInUrl ?? defaults.afterSignInUrl,
    afterSignOutUrl: userConfig.afterSignOutUrl ?? defaults.afterSignOutUrl,
    apiUrl:
      userConfig.apiUrl ??
      process.env.INAI_API_URL ??
      process.env.NEXT_PUBLIC_INAI_API_URL ??
      defaults.apiUrl,
    publishableKey:
      userConfig.publishableKey ??
      process.env.NEXT_PUBLIC_INAI_PUBLISHABLE_KEY ??
      defaults.publishableKey,
  };
}
