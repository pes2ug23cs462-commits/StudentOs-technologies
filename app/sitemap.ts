import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* /sitemap.xml: the public pages search engines should list. The app itself
   (dashboard, college console, etc.) needs a login, so it isn't here. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page("", 1, "weekly"),
    page("/institutions", 0.9, "monthly"),
    page("/careers", 0.8, "weekly"),
    page("/about", 0.7, "monthly"),
    page("/reviews", 0.6, "weekly"),
    page("/contact", 0.6, "yearly"),
    page("/signup", 0.6, "yearly"),
    page("/login", 0.4, "yearly"),
    page("/verify", 0.4, "yearly"),
    page("/privacy", 0.3, "yearly"),
    page("/terms", 0.3, "yearly"),
  ];
}
