import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);

const BOOT_GUARD_ANCHOR = "se-main-script";

// Vite re-emits the entry <script> with a hashed `src` and keeps only the
// attributes it put there itself, so the `id` written in index.html never
// reaches dist/. The B-164 boot-recovery guard anchors on that id, so it hit
// `if (!el) return;` and shipped dead for its entire life (B-320): a chunk
// pruned by a superseding deploy left the user on the spinner forever.
//
// This runs `post`, the only point at which the rewritten tag exists. The throw
// is the load-bearing part — if a future Vite changes the emit shape the build
// stops, instead of silently shipping a dead guard a second time.
function keepBootGuardAnchor() {
  return {
    name: "se-keep-boot-guard-anchor",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const tags = (html.match(/<script\b[^>]*><\/script>/g) || []).filter(
          (t) => /\btype="module"/.test(t) && /\bsrc="/.test(t)
        );
        if (tags.length !== 1) {
          throw new Error(
            `[se-keep-boot-guard-anchor] expected exactly 1 module entry <script> ` +
              `in the emitted HTML, found ${tags.length}. The boot-recovery guard ` +
              `anchors on #${BOOT_GUARD_ANCHOR}; emitting without it strands users ` +
              `behind a 404 chunk during a deploy (B-320).`
          );
        }
        const [tag] = tags;
        if (tag.includes(`id="${BOOT_GUARD_ANCHOR}"`)) return html;
        return html.replace(
          tag,
          tag.replace("<script", `<script id="${BOOT_GUARD_ANCHOR}"`)
        );
      },
    },
  };
}

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
    keepBootGuardAnchor(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest runtime vendors into their own chunks so the main
        // app bundle stays small and each vendor caches independently.
        // (html2canvas is not in the import graph, so it is intentionally omitted.)
        manualChunks: {
          recharts: ["recharts"],
          sentry: ["@sentry/react"],
          "date-fns": ["date-fns"],
        },
      },
    },
  },
  server: {
    proxy: {
      // Mirror the Vercel `api/fx.js` function in local dev. Without this the
      // currency work can only ever be verified in production, which means the
      // one path you most want to see with your own eyes — a real rate applied
      // to real numbers — is the one path you cannot test before shipping it.
      //
      // Frankfurter's range endpoint puts the dates in the PATH (`/a..b`) while
      // our client puts them in the query, so the rewrite moves them. The
      // response shape is identical either way, which is why `api/fx.js` passes
      // `rates` straight through and this proxy can too.
      "/api/fx": {
        target: "https://api.frankfurter.dev",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const q = new URLSearchParams(path.split("?")[1] || "");
          const base = q.get("base") || "USD";
          const symbols = q.get("symbols") || "";
          const start = q.get("start");
          const end = q.get("end");
          const date = q.get("date");
          const tail = `?base=${base}${symbols ? `&symbols=${symbols}` : ""}`;
          if (start && end) return `/v1/${start}..${end}${tail}`;
          if (date) return `/v1/${date}${tail}`;
          return `/v1/latest${tail}`;
        },
      },
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
