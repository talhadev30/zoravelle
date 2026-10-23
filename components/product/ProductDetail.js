import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import ProductReviews from "@/components/ui/ProductReviews";
import { MotionSection, MotionItem } from "@/components/ui/MotionWrapper";
import { formatCurrency, productPrice } from "@/lib/storefront";

function productStructuredData(product) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");
  const productUrl = `${cleanSiteUrl}/shop/${encodeURIComponent(product.id)}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description ||
      product.name + " " + product.category.toLowerCase() + " from Zoravelle.",
    image: [product.image],
    sku: product.id,
    brand: { "@type": "Brand", name: "Zoravelle" },
    category: product.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: productPrice(product),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: productUrl,
    },
  };
  if (product.rating > 0 && product.reviews > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
    };
  }
  return data;
}

export default function ProductDetail({ product, relatedProducts, openTryOn }) {
  const structuredData = productStructuredData(product);
  return (
    <main className="container-z py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-black/55">
        <Link href="/">Home</Link> /{" "}
        <Link href={"/shop?category=" + encodeURIComponent(product.category)}>
          {product.category}
        </Link>{" "}
        / {product.name}
      </nav>
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f1ece4]">
          <Image
            src={product.image}
            alt={product.name + " " + product.shape + " " + product.category}
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="product-card-image object-contain"
          />
          {product.saleLabel && (
            <span className="absolute left-4 top-4 rounded-full bg-red-700 px-3 py-1 text-xs text-white">
              Sale
            </span>
          )}
        </div>
        <section aria-labelledby="product-title">
          <p className="text-xs uppercase tracking-[0.18em] text-black/50">
            {product.category}
          </p>
          <h1
            id="product-title"
            className="mt-2 font-space text-4xl sm:text-5xl"
          >
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-black/55">
            {product.shape} | {product.material} | {product.gender}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm">
            <Star
              aria-hidden="true"
              className="h-4 w-4 fill-amber-400 text-amber-500"
            />
            {product.rating > 0 ? product.rating.toFixed(1) : "No rating yet"}
            {" (" + product.reviews + " reviews)"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xl">
            <span>{formatCurrency(productPrice(product))}</span>
            {product.salePrice && (
              <span className="text-base text-black/45 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          <ProductPurchasePanel key={product.id} product={product} openTryOn={openTryOn} />
          <div className="mt-7 space-y-2 border-t border-black/10 pt-5">
            <details className="rounded-xl border border-black/10 bg-white/45 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                About this frame
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-black/70">
                {product.description ||
                  "A considered " +
                    product.category.toLowerCase() +
                    " frame for everyday wear."}
              </p>
            </details>
            <details className="rounded-xl border border-black/10 bg-white/45 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Frame measurements
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                {[
                  ["Lens", product.measurements.lens],
                  ["Bridge", product.measurements.bridge],
                  ["Temple", product.measurements.temple],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/75 p-3">
                    <p className="font-space text-xl">
                      {value == null ? "-" : value + "mm"}
                    </p>
                    <p className="text-xs text-black/55">{label}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
      </div>
      <section
        className="mt-14 border-t border-black/10 pt-8"
        aria-labelledby="reviews-title"
      >
        <h2 id="reviews-title" className="font-space text-3xl">
          Customer reviews
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-black/55">
          Read frame feedback from the Zoravelle community or share your
          experience.
        </p>
        <div className="mt-5">
          <ProductReviews productId={product.id} />
        </div>
      </section>
      {relatedProducts.length > 0 && (
        <MotionSection className="mt-14" aria-labelledby="related-frames-title" as="section" stagger staggerDelay={0.09}>
          <div className="mb-6 flex items-end justify-between">
            <h2 id="related-frames-title" className="font-space text-3xl">
              More {product.category.toLowerCase()}
            </h2>
            <Link href="/shop" className="text-sm underline underline-offset-4 hover:opacity-80">
              Shop all frames
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {relatedProducts.map((entry) => (
              <MotionItem key={entry.id} hoverLift as="article" className="group">
                <Link
                  href={"/shop/" + encodeURIComponent(entry.id)}
                  className="block"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f1ece4] transition-shadow duration-300 group-hover:shadow-md">
                    <Image
                      src={entry.image}
                      alt={entry.name + " " + entry.category}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="product-card-image object-contain transition duration-500 ease-out group-hover:scale-108"
                    />
                  </div>
                  <h3 className="mt-3 font-space transition-colors group-hover:text-black/80">{entry.name}</h3>
                  <p className="text-sm text-black/55">
                    {formatCurrency(productPrice(entry))}
                  </p>
                </Link>
              </MotionItem>
            ))}
          </div>
        </MotionSection>
      )}
      <div className="mt-12 border-t border-black/10 pt-5 text-sm">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-black/60 hover:text-black"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Continue shopping
        </Link>
      </div>
    </main>
  );
}
