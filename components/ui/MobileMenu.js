"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Shop all", href: "/shop" },
  { label: "Eyeglasses", href: "/shop?category=Eyeglasses" },
  { label: "Sunglasses", href: "/shop?category=Sunglasses" },
  { label: "Blue-light", href: "/shop?category=Blue-light" },
  { label: "Kids", href: "/shop?category=Kids" },
];

export default function MobileMenu() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMenuOpen((open) => !open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-black/5 active:scale-90 motion-reduce:transition-none"
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`absolute left-0 top-full w-full origin-top overflow-hidden border-t border-[#e5dfd5] bg-[#f6f3ed] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.15)] transition-[max-height,opacity] duration-300 motion-reduce:transition-none ${
          menuOpen
            ? "pointer-events-auto max-h-96 opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-5 px-5 py-5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="group relative block w-fit text-sm text-[#383530] transition-colors duration-200 hover:text-black"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-black transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}