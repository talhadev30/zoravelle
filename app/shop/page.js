import ShopClient from "./ShopClient";
import { CATEGORIES } from "@/lib/storefront";
import { getShopMaxPrice, getStoreProducts } from "@/lib/catalog";

const categoryDescriptions = {
  Eyeglasses:
    "Browse Zoravelle optical eyeglasses and prescription-ready frames. Compare shapes, colors, acetate and metal materials, and lens options.",
  Sunglasses:
    "Explore Zoravelle sunglasses with UV protection in classic round, square, aviator, and cat-eye styles. Prices shown in PKR.",
  "Blue-light":
    "Browse Zoravelle blue-light blocking glasses designed for comfortable screen use. Compare frame measurements and lightweight styles.",
  Kids:
    "Find durable, lightweight kids' eyewear at Zoravelle. Review frame measurements, colors, and stock before ordering online in Pakistan.",
};

const categoryTitles = {
  Eyeglasses: "Eyeglasses & Optical Frames",
  Sunglasses: "Sunglasses & Tinted Frames",
  "Blue-light": "Blue-Light Blocking Glasses",
  Kids: "Kids' Eyewear & Frames",
};

function firstValue(value) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const category = firstValue(params.category);
  const isWishlist = ["true", "1"].includes(firstValue(params.wishlist));
  const validCategory = CATEGORIES.includes(category) ? category : "";

  const title = isWishlist
    ? "Your Saved Frames"
    : validCategory
      ? categoryTitles[validCategory] || `${validCategory} Eyewear`
      : "Shop Eyeglasses & Sunglasses Online";

  const description = isWishlist
    ? "Review the eyewear and frames saved to your Zoravelle wishlist."
    : categoryDescriptions[validCategory] ||
      "Shop all eyeglasses, sunglasses, blue-light frames, and kids' eyewear. Compare frame colors, measurements, and lens options with prices in PKR.";

  const canonicalPath = isWishlist
    ? "/shop"
    : validCategory
      ? `/shop?category=${encodeURIComponent(validCategory)}`
      : "/shop";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    ...(isWishlist ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: "Zoravelle",
      locale: "en_PK",
      title: `${title} | Zoravelle`,
      description,
      url: canonicalPath,
      images: [
        {
          url: "/images/hero.jpg",
          width: 1200,
          height: 630,
          alt: `${title} - Zoravelle`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Zoravelle`,
      description,
      images: ["/images/hero.jpg"],
    },
  };
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams;
  const requestedCategory = firstValue(params.category);
  const category = CATEGORIES.includes(requestedCategory) ? requestedCategory : "";
  const wishlist = firstValue(params.wishlist);
  const [products, shopMaxPrice] = await Promise.all([
    getStoreProducts(),
    getShopMaxPrice(),
  ]);

  return (
    <ShopClient
      category={category}
      onlyWishlist={wishlist === "true" || wishlist === "1"}
      products={products}
      shopMaxPrice={shopMaxPrice}
    />
  );
}
