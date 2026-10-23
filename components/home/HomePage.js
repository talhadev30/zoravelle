import CategorySection from "@/components/home/CategorySection";
import EyewearBenefits from "@/components/home/EyewearBenefits";
import FaceShapeSection from "@/components/home/FaceShapeSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import HomeHero from "@/components/home/HomeHero";
import FeedbackSection from "@/components/ui/FeedbackSection";
import { MotionSection } from "@/components/ui/MotionWrapper";
import Link from "next/link";

export default function HomePage({ featuredProducts }) {
  return (
    <main>
      <HomeHero />
      <CategorySection />
      <FeaturedProducts products={featuredProducts} />
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
