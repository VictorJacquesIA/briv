import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Acesso ao dev server pelo celular na mesma rede Wi-Fi (192.168.101.10) —
  // sem isso o Next.js loga "Cross origin request detected" e, em versões
  // futuras, passa a bloquear os assets de _next/* vindos desse IP.
  allowedDevOrigins: ["192.168.101.10"],
  // Server Actions limitam o corpo da requisição a 1MB por padrão — o
  // upload de foto de perfil (features/perfil/actions.ts) libera até 5MB,
  // então sem isso qualquer foto de celular normal (quase sempre > 1MB) era
  // rejeitada pelo próprio Next.js antes de chegar no código da action.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    optimizePackageImports: ["lucide-react"],
  },
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
