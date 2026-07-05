import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);

export default defineConfig({
  // Expose the package version to the client bundle (used by the feedback tab's
  // context auto-attach). Only the version string is injected — not all of pkg.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    // Embed an application key into every first-party bundle so the runtime
    // `thirdPartyErrorFilterIntegration` can tell OUR code from injected /
    // browser-extension scripts (which surface as <anonymous> frames) and drop
    // their noise. No auth token / source-map upload / release creation needed —
    // this only injects the key, so it can never fail the Vercel build.
    sentryVitePlugin({
      applicationKey: "swing-edge",
      telemetry: false,
      sourcemaps: { disable: true },
      release: { create: false, finalize: false },
    }),
  ],
  server: {
    proxy: {
      // Mirror the Vercel `api/symbol-search.js` function in local dev:
      // forward /api/symbol-search?text=... to TradingView with the Referer
      // header it requires (the browser can't set Referer itself → 403).
      "/api/symbol-search": {
        target: "https://symbol-search.tradingview.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) =>
          path.replace(/^\/api\/symbol-search/, "/symbol_search/"),
        headers: {
          Referer: "https://www.tradingview.com/",
          Origin: "https://www.tradingview.com",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
      },
    },
  },
});
