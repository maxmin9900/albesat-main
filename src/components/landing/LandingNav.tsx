"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { scrollToTarget } from "@/lib/lenis-instance";

const LINKS = [
  { href: "/#cities", label: "Cities" },
  { href: "/collection", label: "Collection" },
  { href: "/auctions", label: "Auctions" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
];

/** Scroll deep enough into the sticky map section that the atlas is fully
 *  grown and the six carpet cities are on screen. */
function scrollToCities() {
  const el = document.getElementById("cities");
  if (!el) return;
  const to =
    el.offsetTop + Math.max(0, (el.offsetHeight - window.innerHeight) * 0.4);
  scrollToTarget(to, { duration: 2 });
}

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // arriving from another page with /#cities — glide to the map once loaded
  useEffect(() => {
    if (window.location.hash === "#cities") {
      const t = setTimeout(scrollToCities, 600);
      return () => clearTimeout(t);
    }
  }, []);

  const onNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    setOpen(false);
    if (href === "/#cities" && window.location.pathname === "/") {
      e.preventDefault();
      scrollToCities();
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-gold/10 bg-void/70 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="font-display text-2xl text-gradient-gold">
          ALBESAT
        </a>
        <ul className="hidden items-center gap-8 text-sm text-cream/80 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => onNavClick(e, l.href)}
                className="transition-colors hover:text-gold-light"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg border border-gold/30 p-2 text-gold md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* mobile dropdown */}
      {open && (
        <div className="border-t border-gold/10 bg-void/95 backdrop-blur-md md:hidden">
          <ul className="space-y-1 px-6 py-4 text-sm text-cream/85">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={(e) => onNavClick(e, l.href)}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-gold/10 hover:text-gold-light"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
