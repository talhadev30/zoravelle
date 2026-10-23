export const SITE_NAME = "Zoravelle";

const isProduction = process.env.NODE_ENV === "production";
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()
    : process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL.trim()
      : isProduction
        ? ""
        : "http://localhost:3000");

if (!rawSiteUrl) {
  throw new Error("Set NEXT_PUBLIC_SITE_URL to the public HTTPS site URL before building for production.");
}

let parsedSiteUrl;
try {
  parsedSiteUrl = new URL(rawSiteUrl);
} catch {
  throw new Error("The configured site URL is invalid.");
}
if (!["https:", "http:"].includes(parsedSiteUrl.protocol) || parsedSiteUrl.username || parsedSiteUrl.password) {
  throw new Error("The configured site URL must be an HTTP or HTTPS URL without credentials.");
}
if (isProduction && parsedSiteUrl.protocol !== "https:") {
  throw new Error("The production site URL must use HTTPS.");
}

export const SITE_URL = parsedSiteUrl.origin;
export const metadataBase = new URL(SITE_URL);

export function absoluteSiteUrl(path = "") {
  if (!SITE_URL) return undefined;
  try {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(cleanPath, SITE_URL + "/").toString();
  } catch {
    return undefined;
  }
}

function fitDescription(value) {
  const description = String(value || "").replace(/\s+/g, " ").trim();
  if (description.length <= 160) return description;
  const shortened = description.slice(0, 157).replace(/\s+\S*$/, "").trimEnd();
  return shortened + "...";
}

export function createSeoMetadata({
  title,
  description,
  path,
  image = "/images/hero.jpg",
  noIndex = false,
}) {
  const summary = fitDescription(description);
  const imageUrl = image ? absoluteSiteUrl(image) : undefined;
  const pageUrl = path ? absoluteSiteUrl(path) : undefined;

  return {
    title,
    description: summary,
    ...(path && SITE_URL ? { alternates: { canonical: path } } : {}),
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_PK",
      title,
      description: summary,
      ...(pageUrl ? { url: pageUrl } : {}),
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description: summary,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
