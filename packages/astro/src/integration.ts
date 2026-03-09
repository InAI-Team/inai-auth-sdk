import type { AstroIntegration } from "astro";

export interface InAIAstroConfig {
  apiUrl: string;
  publishableKey?: string;
}

export function inaiAuth(config: InAIAstroConfig): AstroIntegration {
  return {
    name: "@inai-dev/astro",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            define: {
              "import.meta.env.INAI_API_URL": JSON.stringify(config.apiUrl),
              "import.meta.env.INAI_PUBLISHABLE_KEY": JSON.stringify(
                config.publishableKey ?? "",
              ),
            },
          },
        });
      },
    },
  };
}
