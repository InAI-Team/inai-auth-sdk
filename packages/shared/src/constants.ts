export const COOKIE_AUTH_TOKEN = "auth_token";
export const COOKIE_REFRESH_TOKEN = "refresh_token";
export const COOKIE_AUTH_SESSION = "auth_session";

export const DEFAULT_SIGN_IN_URL = "/login";
export const DEFAULT_SIGN_UP_URL = "/register";
export const DEFAULT_AFTER_SIGN_IN_URL = "/";
export const DEFAULT_AFTER_SIGN_OUT_URL = "/login";

export const HEADER_PUBLISHABLE_KEY = "X-Publishable-Key";
export const HEADER_AUTHORIZATION = "Authorization";
export const HEADER_INAI_AUTH = "x-inai-auth";

export const DEFAULT_API_URL = "https://apiauth.inai.dev";
export const DEFAULT_JWKS_URL = "https://apiauth.inai.dev/.well-known/jwks.json";

// Session lifetime constants
export const COOKIE_SESSION_START = "inai_session_start";
export const SESSION_MAX_DURATION_S = 7 * 24 * 60 * 60;        // 7 days in seconds
export const SESSION_MAX_DURATION_MS = SESSION_MAX_DURATION_S * 1000;
export const SESSION_WARNING_BEFORE_MS = 30 * 60 * 1000;       // 30 min before max
export const PROACTIVE_REFRESH_BEFORE_MS = 5 * 60 * 1000;      // 5 min before access token
export const REFRESH_CHECK_INTERVAL_MS = 60 * 1000;            // check every 60 sec
