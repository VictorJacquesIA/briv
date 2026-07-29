"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Em dev, um service worker registrado atrapalha o Fast Refresh e pode
    // servir bundle antigo depois de um hot-reload — só registra em produção.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Falha ao registrar o service worker:", error);
    });
  }, []);

  return null;
}
