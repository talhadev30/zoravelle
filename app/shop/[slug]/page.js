import { notFound } from "next/navigation";
import ProductDetail from "@/components/product/ProductDetail";
import { getRelatedProducts, getStoreProduct } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);

  if (!product) {
    return {
      title: "Frame Not Found",
      description: "This eyewear product is no longer available at Zoravelle.",
      robots: { index: false, follow: false },
    };
  }

  const effectivePrice = product.salePrice ?? product.price;
  const formattedPrice = "PKR " + Number(effectivePrice).toLocaleString("en-PK");
  const rawDescription = String(product.description || "").replace(/\s+/g, " ").trim();
  const descSnippet = rawDescription
    ? rawDescription.slice(0, 155).trim()
    : `Thoughtfully crafted ${product.shape.toLowerCase()} ${product.category.toLowerCase()} frames designed for everyday wear.`;
  const description = `${product.name} ${product.category} - ${formattedPrice}. ${descSnippet}`;
  const canonicalPath = `/shop/${encodeURIComponent(product.id)}`;

  return {
    title: `${product.name} ${product.category}`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      siteName: "Zoravelle",
      locale: "en_PK",
      title: `${product.name} ${product.category} | Zoravelle`,
      description,
      url: canonicalPath,
      images: product.image
        ? [
            {
              url: product.image,
              alt: `${product.name} ${product.category} - Zoravelle`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} ${product.category} | Zoravelle`,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getStoreProduct(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(product.id, product.category);

  return (
    <ProductDetail
      product={product}
      relatedProducts={relatedProducts}
      openTryOn={query.tryOn === "1"}
    />
  );
}
