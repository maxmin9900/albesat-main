import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { CONTACT } from "@/lib/contact";

/** Footer for all inner pages (collection, auctions, …) — not the landing. */
export default function SiteFooter() {
  const rows = [
    { Icon: Phone, label: CONTACT.phone, href: CONTACT.phoneHref },
    { Icon: Mail, label: CONTACT.email, href: CONTACT.emailHref },
    { Icon: Instagram, label: CONTACT.instagram, href: CONTACT.instagramHref },
    { Icon: MapPin, label: CONTACT.location, href: undefined },
  ];

  return (
    <footer className="border-t border-gold/15 bg-void">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl tracking-[0.25em] text-gold">
            ALBESAT
          </p>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/60">
            Curators of the world&apos;s finest Persian textile artifacts. Every
            piece in our collection is a testament to the master weavers of
            history.
          </p>
          {/* the house's contact details — same data as the concierge card */}
          <ul className="mt-6 space-y-3">
            {rows.map(({ Icon, label, href }) => {
              const body = (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span dir="ltr">{label}</span>
                </>
              );
              return (
                <li key={label} className="text-sm text-cream/70">
                  {href ? (
                    <a
                      href={href}
                      {...(href.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="flex items-center gap-3 transition-colors hover:text-gold-light"
                    >
                      {body}
                    </a>
                  ) : (
                    <span className="flex items-center gap-3">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-gold">
            COLLECTIONS
          </p>
          <ul className="mt-5 space-y-3 text-sm text-cream/70">
            <li><a href="/collection?city=qom" className="transition-colors hover:text-gold-light">Imperial Silk</a></li>
            <li><a href="/collection?city=shiraz" className="transition-colors hover:text-gold-light">Antique Tribal</a></li>
            <li><a href="/collection?city=kashan" className="transition-colors hover:text-gold-light">Masterpiece Kashan</a></li>
            <li><a href="/collection?city=baluch" className="transition-colors hover:text-gold-light">Nomadic Weaves</a></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-gold">
            CONCIERGE
          </p>
          <ul className="mt-5 space-y-3 text-sm text-cream/70">
            <li><a href="/collection" className="transition-colors hover:text-gold-light">Private Viewing</a></li>
            <li><a href="#" className="transition-colors hover:text-gold-light">Restoration</a></li>
            <li><a href="#" className="transition-colors hover:text-gold-light">Authentication</a></li>
            <li><a href="#" className="transition-colors hover:text-gold-light">Global Shipping</a></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-gold">
            THE HOUSE
          </p>
          <ul className="mt-5 space-y-3 text-sm text-cream/70">
            <li><a href="/" className="transition-colors hover:text-gold-light">Our Heritage</a></li>
            <li><a href="/collection" className="transition-colors hover:text-gold-light">Galleries</a></li>
            <li><a href="#" className="transition-colors hover:text-gold-light">Journal</a></li>
            <li><a href="#" className="transition-colors hover:text-gold-light">Careers</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gold/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-[10px] tracking-[0.25em] text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} ALBESAT FINE CARPETS.{" "}
            {CONTACT.locationLong.toUpperCase()}.
          </p>
          <div className="flex gap-8">
            <a href="#" className="transition-colors hover:text-gold-light">PRIVACY POLICY</a>
            <a href="#" className="transition-colors hover:text-gold-light">TERMS OF SERVICE</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
