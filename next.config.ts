import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the agent context; stop next dev from writing AGENTS.md.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
