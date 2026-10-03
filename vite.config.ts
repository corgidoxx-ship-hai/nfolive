import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  // Vite only exposes VITE_* vars to code. Server functions read SUPABASE_*,
  // OPENAI_API_KEY etc. from process.env, so copy the rest of .env there.
  // Real environment variables (hosting dashboard, CI) always win.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    server: { port: 3000 },
    resolve: {
      // Resolves the "@/*" alias from tsconfig.json
      tsconfigPaths: true,
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        // Our SSR error wrapper lives in src/server.ts
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      // Deploy adapter, build only. With no preset Nitro auto-detects Vercel / Netlify /
      // Cloudflare when building on them and falls back to a plain Node server elsewhere.
      // Force one with: NITRO_PRESET=node-server (or vercel, netlify, cloudflare-module ...)
      ...(command === "build" ? [nitro()] : []),
      viteReact(),
    ],
  };
});
