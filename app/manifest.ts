import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tasks · gestor de tareas",
    short_name: "tasks",
    description: "Organiza tu día: listas, prioridades, matriz de Eisenhower y racha diaria.",
    start_url: "/hoy",
    display: "standalone",
    background_color: "#091e42",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
