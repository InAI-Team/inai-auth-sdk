import type { AstroIntegration } from "astro";

export interface InAIAstroConfig {}

export function inaiAuth(_config: InAIAstroConfig = {}): AstroIntegration {
  return {
    name: "@inai-dev/astro",
    hooks: {},
  };
}
