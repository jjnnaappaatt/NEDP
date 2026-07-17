import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example";

// The only public, index-worthy page is the guide (/manual). Everything else is the field-officer data
// system (dashboards, submissions, admin) — kept out of search indexes. Longest-match wins, so the
// specific /manual allow overrides the "/" disallow.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/manual", disallow: "/" }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
