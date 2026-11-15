import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* /robots.txt: let search engines read the public pages, keep them out of the
   signed-in app, the team and partner consoles, interview links and the API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/setup",
          "/onboarding",
          "/settings",
          "/assistant",
          "/plan",
          "/study-plan",
          "/schedule",
          "/session",
          "/learn",
          "/notes",
          "/tests",
          "/exam-prep",
          "/code",
          "/interview",
          "/resume",
          "/projects",
          "/placement",
          "/certificates",
          "/goals",
          "/timeline",
          "/resources",
          "/premium",
          "/join",
          "/college",
          "/company",
          "/partner",
          "/careers/interview/",
          "/share/",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
