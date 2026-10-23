import { Suspense } from "react";
import CategorySection from "@/components/home/CategorySection";
import EyewearBenefits from "@/components/home/EyewearBenefits";
import FaceShapeSection from "@/components/home/FaceShapeSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import HomeHero from "@/components/home/HomeHero";
import FeedbackSection from "@/components/ui/FeedbackSection";
import { MotionSection } from "@/components/ui/MotionWrapper";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFeaturedProducts } from "@/lib/catalog";
import Link from "next/link";

async function FeaturedProductsContent() {
  const products = await getFeaturedProducts();
  return <FeaturedProducts products={products} />;
}

function FeaturedProductsLoading() {
  return (
    <section
      className="container-z bg-offwhite min-h-[48rem] sm:min-h-[56rem] lg:min-h-[30rem] py-10 md:py-14"
      aria-label="Loading featured eyewear"
      aria-busy="true"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-9 w-56 sm:w-72" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="min-w-0">
              <Skeleton className="aspect-square rounded-2xl" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <CategorySection />
      <Suspense fallback={<FeaturedProductsLoading />}>
        <FeaturedProductsContent />
      </Suspense>
      <FaceShapeSection />
      <EyewearBenefits />
      <MotionSection className="container-z py-14 sm:py-18" aria-labelledby="eyewear-guide-title" as="section">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-black/50">
            The Zoravelle guide
          </p>
          <h2 id="eyewear-guide-title" className="mt-2 font-space text-3xl sm:text-4xl">
            Find eyewear for your everyday
          </h2>
          <p className="mt-4 leading-relaxed text-black/65">
            Browse optical frames, sunglasses, blue-light styles, and kids&apos; eyewear.
            Product pages show available colors, frame measurements, stock, and lens
            choices, so you can compare the details before you order. Use virtual
            try-on to preview a frame with your photo, and see prices in PKR.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-full border border-black/20 px-5 py-3 text-sm font-medium transition hover:bg-black/5"
          >
            Explore all eyewear
          </Link>
        </div>
      </MotionSection>
      <FeedbackSection />
    </main>
  );
}
