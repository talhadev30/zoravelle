import { getProductSitemapEntries } from "@/lib/catalog";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

const staticPages = [
  "",
  "/shop",
  "/about",
  "/stores",
  "/faq",
  "/shipping",
  "/returns",
  "/contact",
  "/prescription",
  "/careers",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
];

export default async function sitemap() {
  const baseUrl = (SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

  const staticEntries = staticPages.map((route) => ({
    url: baseUrl + route,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/shop" ? "daily" : "monthly",
    priority: route === "" ? 1.0 : route === "/shop" ? 0.9 : 0.6,
  }));

  let productEntries = [];
  try {
    const products = await getProductSitemapEntries();
    productEntries = (products || [])
      .filter((product) => product && product.id)
      .map((product) => ({
        url: baseUrl + "/shop/" + encodeURIComponent(product.id),
        ...(product.updatedAt ? { lastModified: new Date(product.updatedAt) } : {}),
        changeFrequency: "weekly",
        priority: 0.8,
      }));
  } catch (error) {
    console.error("Error generating product sitemap:", error?.name || "Error");
  }

  return [...staticEntries, ...productEntries];
}
