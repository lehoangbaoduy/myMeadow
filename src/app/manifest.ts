import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyMeadow — Rental Management",
    short_name: "MyMeadow",
    description: "MyMeadow Rental Management System",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7ED",
    theme_color: "#F97316",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
