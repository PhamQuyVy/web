import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return ["/intro", "/privacy", "/terms"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/intro" ? "weekly" : "yearly",
    priority: path === "/intro" ? 1 : 0.3,
  }));
}
