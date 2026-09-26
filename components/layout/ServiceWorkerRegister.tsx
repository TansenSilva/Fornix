"use client";

import { useEffect } from "react";

/** Registra o service worker (necessário para a PWA e para a página offline). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sem service worker o app continua funcionando normalmente.
    });
  }, []);
  return null;
}
