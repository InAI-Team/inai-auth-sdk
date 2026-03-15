import type { UserResource } from "./resources";

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResult {
  mfa_required?: boolean;
  mfa_token?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserResource;
}

export interface MFAChallengeParams {
  mfa_token: string;
  code: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface SignInResult {
  status: "complete" | "needs_mfa" | "error";
  mfa_token?: string;
  user?: UserResource;
  error?: string;
}

export interface SignUpResult {
  status: "complete" | "needs_email_verification" | "error";
  user?: UserResource;
  error?: string;
}

export interface InAIAuthErrorBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}
