import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // O projeto vive dentro de uma pasta sincronizada pelo OneDrive, que trava
  // arquivos temporários durante o sync e quebra o rename do cache persistente
  // do webpack (ENOENT em .next/cache/webpack/**/*.pack.gz_). Desligar o cache
  // em dev evita esse erro; troca um pouco de velocidade de rebuild por estabilidade.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
