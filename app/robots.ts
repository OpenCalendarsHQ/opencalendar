import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/welcome", "/privacy", "/terms"],
      disallow: [
        "/dashboard/*",
        "/settings",
        "/api/*",
        "/auth/*",
        "/_next/*",
        "/static/*",
      ],
    },
    sitemap: "https://opencalendars.app/sitemap.xml",
    host: "https://opencalendars.app",
  };
}
