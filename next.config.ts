import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  devIndicators: false, // Remove widget de desenvolvimento Next.js

  // A checagem de tipos e o lint rodam no build. Se algo quebrar aqui, é bug
  // real — corrija em vez de reativar o `ignore`.
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      // Supabase Storage (avatares, anexos de comprovantes)
      { protocol: "https", hostname: "*.supabase.co" },
      // Avatares de contas Google (login OAuth)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Bancos de imagem usados na landing
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      // Blob storage da Vercel
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Desenvolvimento local
      ...(isDev ? [{ protocol: "http" as const, hostname: "localhost" }] : []),
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Headers de segurança. Note que NÃO existe `Access-Control-Allow-Origin: *`:
  // esta é uma aplicação financeira autenticada por cookie, e liberar CORS para
  // qualquer origem com credenciais permitiria que outro site lesse os dados do
  // usuário logado.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
