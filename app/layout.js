import { Space_Grotesk } from "next/font/google";
import Script from "next/script";
import Footer from "@/components/ui/Footer";
import Navbar from "@/components/ui/Navbar";
import { getStoreSettings } from "@/lib/catalog";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const themeInitializationScript =
  'try { var savedTheme = localStorage.getItem("zv-theme"); var useDark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.classList.toggle("dark", useDark); document.documentElement.style.colorScheme = useDark ? "dark" : "light"; } catch {}';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
const cleanSiteUrl = siteUrl.replace(/\/+$/, "");

export const metadata = {
  metadataBase: new URL(cleanSiteUrl),
  title: {
    default: "Zoravelle — Eyeglasses & Sunglasses in Pakistan",
    template: "%s | Zoravelle",
  },
  description:
    "Shop considered eyeglasses, sunglasses, blue-light blocking frames, and kids' eyewear online in Pakistan. Compare frame colors, measurements, lens options, and preview with virtual try-on.",
  applicationName: "Zoravelle",
  creator: "Zoravelle",
  publisher: "Zoravelle",
  category: "Eyewear",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Zoravelle",
    locale: "en_PK",
    title: "Zoravelle — Eyeglasses & Sunglasses in Pakistan",
    description:
      "Shop considered eyeglasses, sunglasses, blue-light blocking frames, and kids' eyewear online in Pakistan. Compare frame colors, lens options, and virtual try-on.",
    url: cleanSiteUrl,
    images: [
      {
        url: "/images/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Zoravelle Eyewear Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zoravelle — Eyeglasses & Sunglasses in Pakistan",
    description:
      "Shop considered eyeglasses, sunglasses, blue-light blocking frames, and kids' eyewear online in Pakistan. Compare frame colors, lens options, and virtual try-on.",
    images: ["/images/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/images/favicon.svg",
    apple: "/images/apple-touch-icon.png",
  },
};

export default async function RootLayout({ children }) {
  const settings = await getStoreSettings();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings?.storeName || "Zoravelle",
    url: cleanSiteUrl,
    logo: `${cleanSiteUrl}/images/favicon.svg`,
    description:
      "Zoravelle offers considered eyeglasses, sunglasses, blue-light blocking frames, and kids' eyewear in Pakistan.",
    ...(settings?.contactEmail || settings?.phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
            ...(settings.phone ? { telephone: settings.phone } : {}),
            areaServed: "PK",
            availableLanguage: ["en", "ur"],
          },
        }
      : {}),
  };

  return (
    <html lang="en-PK" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-offwhite font-space" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c"),
          }}
        />
        <Navbar />
        <div className="grow flex-1">{children}</div>
        <Footer />
        <Script id="zv-theme-init" strategy="beforeInteractive">
          {themeInitializationScript}
        </Script>
      </body>
    </html>
  );
}
