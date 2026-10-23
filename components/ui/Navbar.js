import Link from "next/link";
import MobileMenu from "@/components/ui/MobileMenu";
import AnnouncementBar from "@/components/ui/AnnouncementBar";
import HeaderActions from "@/components/ui/HeaderActions";
import AccountNav from "@/components/ui/AccountNav";
import BrandLink from "@/components/ui/BrandLink";

const navItems = [
  { label: "All Products", href: "/shop" },
  { label: "Eyeglasses", href: "/shop?category=Eyeglasses" },
  { label: "Sunglasses", href: "/shop?category=Sunglasses" },
  { label: "Blue-light", href: "/shop?category=Blue-light" },
  { label: "Kids", href: "/shop?category=Kids" },
];

export default function Navbar() {
  return <header className="relative z-50 w-full border-b border-[#e5dfd5] bg-[#f6f3ed]">
    <AnnouncementBar />
    <div className="mx-auto flex min-h-15.5 max-w-350 items-center justify-between gap-2 px-3 sm:px-5 md:px-8">
      <BrandLink />
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 lg:flex">{navItems.map((item) => <Link key={item.label} href={item.href} className="whitespace-nowrap text-[13px] text-[#65615c] transition hover:text-black">{item.label}</Link>)}</nav>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 text-black sm:gap-1"><HeaderActions /><AccountNav /><MobileMenu /></div>
    </div>
  </header>;
}
