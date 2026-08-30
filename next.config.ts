import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  transpilePackages: ["@agenttower/sdk"],
};

export default nextConfig;
