import { SITE_URL } from "@/lib/seo";

export default function robots() {
  const baseUrl = (SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/account",
        "/cart",
        "/checkout",
        "/profile",
        "/login",
        "/register",
        "/track-order",
      ],
    },
    sitemap: baseUrl + "/sitemap.xml",
  };
}
