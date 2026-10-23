import { connection } from "next/server";
import HomePage from "@/components/home/HomePage";

export const metadata = {
  title: "Eyeglasses & Sunglasses for Everyday Wear",
  description:
    "Find premium eyeglasses, sunglasses, blue-light blocking frames, and kids' eyewear at Zoravelle. Compare colors and lens options, preview frames with virtual try-on, and shop online in Pakistan.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Eyeglasses & Sunglasses for Everyday Wear | Zoravelle",
    description:
      "Find premium eyeglasses, sunglasses, blue-light blocking frames, and kids' eyewear at Zoravelle. Compare colors and lens options, preview frames with virtual try-on, and shop online in Pakistan.",
    url: "/",
    images: [
      {
        url: "/images/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Zoravelle Eyewear Collection",
      },
    ],
  },
};

export default async function Home() {
  await connection();
  return <HomePage />;
}
