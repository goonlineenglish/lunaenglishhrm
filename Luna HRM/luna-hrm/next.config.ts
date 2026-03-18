import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output reduces memory footprint (~194MB → ~120MB)
  // and speeds up cold starts on Ubuntu server
  output: "standalone",

  // Enable gzip compression at Next.js level
  // (backup in case Caddy is bypassed by Cloudflare Tunnel)
  compress: true,

  // Don't leak framework info via X-Powered-By header
  poweredByHeader: false,

  serverExternalPackages: [],
};

export default nextConfig;
