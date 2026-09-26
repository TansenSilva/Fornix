import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/app-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: appConfig.name,
    short_name: appConfig.shortName,
    description: appConfig.description,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: appConfig.backgroundColor,
    theme_color: appConfig.themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novo fornecedor", url: "/fornecedores/novo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
