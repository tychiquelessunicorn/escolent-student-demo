import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Turbopack doesn't walk up to the home directory
  // looking for a lockfile.
  turbopack: { root: process.cwd() },
  // Next generates its own root CLAUDE.md, which would shadow the project
  // constitution at cursor-handoff/CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
