import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.example";

// Only the public guide is listed (its sections are #hash anchors, not separate URLs).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/manual`, changeFrequency: "monthly", priority: 1 },
  ];
}
