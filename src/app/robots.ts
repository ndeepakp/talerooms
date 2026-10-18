import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

// Let search engines crawl public content; keep private/authoring areas out.
export default function robots(): MetadataRoute.Robots {
  if (process.env.DEPLOYMENT_ENV === "dev") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = process.env.BETTER_AUTH_URL || "https://talerooms.fly.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings", "/write", "/drafts", "/login", "/signup"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
