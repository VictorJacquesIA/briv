import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "UNA Compras",
    short_name: "UNA Compras",
    description: "Painel interno de compras para construtoras.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Preto puro, não #121212 do tema — bate exatamente com o fundo de
    // public/pwa.png (fonte do icon-512.png), sem costura visível na splash
    // que o Chrome/Android monta a partir desses dois campos + o ícone.
    background_color: "#000000",
    theme_color: "#000000",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
