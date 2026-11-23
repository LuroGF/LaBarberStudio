import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/mi-cuenta", "/api/", "/auth/", "/cita/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
