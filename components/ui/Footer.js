import Link from "next/link";
import BrandLink from "@/components/ui/BrandLink";
import NewsletterForm from "@/components/ui/NewsletterForm";

const shopLinks = [
  { label: "All frames", href: "/shop" },
  { label: "Eyeglasses", href: "/shop?category=Eyeglasses" },
  { label: "Sunglasses", href: "/shop?category=Sunglasses" },
  { label: "Blue-light", href: "/shop?category=Blue-light" },
  { label: "Kids", href: "/shop?category=Kids" },
];
const helpLinks = [
  { label: "Contact us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns and exchanges", href: "/returns" },
  { label: "Track order", href: "/track-order" },
  { label: "Prescription lenses", href: "/prescription" },
];
const companyLinks = [
  { label: "About us", href: "/about" },
  { label: "Stores", href: "/stores" },
  { label: "Careers", href: "/careers" },
];
const legalLinks = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
  { label: "Cookie policy", href: "/cookies" },
  { label: "Accessibility", href: "/accessibility" },
];

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title} className="space-y-2 text-sm">
      <h2 className="mb-3 font-medium">{title}</h2>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block opacity-70 transition hover:opacity-100"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="mt-10 rounded-t-4xl bg-black px-5 font-space text-white sm:mt-14 sm:px-8 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-9 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-5"
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandLink footer />
          <p className="mt-3 max-w-xs text-sm opacity-70">
            Considered eyewear, made to be seen in.
          </p>
        </div>
        <FooterColumn title="Shop" links={shopLinks} />
        <FooterColumn title="Help" links={helpLinks} />
        <FooterColumn title="Company" links={companyLinks} />
        <NewsletterForm />
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-t border-white/15 py-6 text-xs md:flex-row md:items-center md:justify-between">
        <p className="opacity-60">© Zoravelle. All rights reserved.</p>
        <nav aria-label="Legal links" className="flex flex-wrap gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="opacity-60 transition hover:opacity-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
