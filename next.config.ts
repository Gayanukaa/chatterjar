import type { NextConfig } from "next";
import { frameHeaders } from "./lib/embed";

const nextConfig: NextConfig = {
  // CLAUDE.md is the agent context; stop next dev from writing AGENTS.md.
  agentRules: false,
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
    return frameHeaders();
  },
};

export default nextConfig;
