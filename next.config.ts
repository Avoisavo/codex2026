import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @databricks/sql ships native Node addons (native kernel, lz4-napi) that can't be
  // bundled by Turbopack — require them at runtime instead of bundling.
  serverExternalPackages: ["@databricks/sql", "lz4-napi"],
};

export default nextConfig;
