import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Static project root for Turbopack (avoids `process.cwd()` in config). */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  /** Transpile dependencies that ship modern JS for Safari / iOS 15 (see browserslist). */
  transpilePackages: [
    "firebase",
    "framer-motion",
    "date-fns",
    "@hookform/resolvers",
    "html2canvas",
    "jspdf",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Webpack watchOptions (used with `npm run dev` — avoids Turbopack + IDE file-watcher overload on Windows).
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/sample csv/**",
          "**/*-firebase-adminsdk-*.json",
        ],
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
