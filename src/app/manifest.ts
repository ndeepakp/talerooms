import type { MetadataRoute } from "next";

// Web App Manifest — makes Talerooms installable to a phone's home screen and
// launchable full-screen (no browser chrome). Next serves this at /manifest.webmanifest
// and links it from <head> automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Talerooms",
    short_name: "Talerooms",
    description: "Where stories find their people.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    orientation: "portrait",
    categories: ["books", "entertainment", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
