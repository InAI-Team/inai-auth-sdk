import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom", "next", "@inai-dev/react"],
    splitting: false,
    banner: {
      js: '"use client";',
    },
  },
  {
    entry: {
      server: "src/server.ts",
      middleware: "src/middleware.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    external: ["react", "react-dom", "next", "@inai-dev/react"],
    splitting: false,
  },
]);
