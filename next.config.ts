import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: [] },
  // Минимальный автономный сервер в .next/standalone: на облачном хостинге
  // разворачивается без node_modules целиком — важно для контейнера.
  output: "standalone",
};

export default nextConfig;
