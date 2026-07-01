import type { MetadataRoute } from "next";

const BASE = "https://talerooms.fly.dev";

// Let search engines crawl public content; keep private/authoring areas out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings", "/write", "/drafts", "/login", "/signup"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
