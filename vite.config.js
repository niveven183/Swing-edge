import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
