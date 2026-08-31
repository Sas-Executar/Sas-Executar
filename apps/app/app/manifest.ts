import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EXECUTAR",
    short_name: "EXECUTAR",
    description: "Gestão cognitiva e execução de projetos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f5f5",
    theme_color: "#f5f5f5",
    icons: [
      {
        src: "/brand/executar-mark.png",
        sizes: "any",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
