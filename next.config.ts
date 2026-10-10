import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the agent context; stop next dev from writing AGENTS.md.
  agentRules: false,
  // Pack images link to their sources; lib/domain.ts allows the same hosts.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  // lib/packs.ts reads data/packs/ at runtime; ship those files.
  outputFileTracingIncludes: { "/api/admin/**": ["./data/packs/*.json"] },
  turbopack: {
    rules: {
      // Only globals: a "*.css" rule turns *.module.css into global CSS.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // No page is meant to be framed by other sites (clickjacking).
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    ];
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
