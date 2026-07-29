import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "UNA Compras",
  description: "Painel interno de compras para construtoras.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UNA Compras",
    // Splash do iOS ao abrir o app instalado (public/pwa.png) — sem media
    // query, então serve como fallback genérico pra qualquer tamanho de tela.
    startupImage: "/apple-splash.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Preto puro, não #121212 do tema — bate exatamente com o fundo de
  // public/pwa.png (fonte dos ícones/splash), sem costura visível.
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
