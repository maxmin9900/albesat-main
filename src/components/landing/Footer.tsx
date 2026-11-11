import { Instagram, Mail, Phone } from "lucide-react";
import { CONTACT } from "@/lib/contact";

/** Landing-page footer — quote band + ALBESAT CARPET columns. */
export default function Footer() {
  return (
    <footer className="bg-void">
      {/* quote band */}
      <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
        <Ornament />
        <p className="mx-auto mt-10 max-w-2xl font-display text-4xl italic leading-snug text-silk sm:text-5xl">
          &ldquo;Every thread tells a story that transcends time.&rdquo;
        </p>
        <div className="mt-10">
          <Ornament />
        </div>
      </div>

      {/* columns */}
      <div className="border-t border-gold/10 bg-[#08080e]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xl font-bold tracking-[0.2em] text-silk">
              ALBESAT
              <span className="mt-1 block text-[10px] font-normal tracking-[0.45em] text-gold">
                CARPET
              </span>
            </p>
            <p className="mt-5 max-w-xs text-xs leading-relaxed text-muted">
              Purveyors of the finest Persian handwoven heritage. Connecting
              collectors with the timeless artistry of the Isfahan, Tabriz, and
              Kashan weaving traditions.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-gold">
              QUICK LINKS
            </p>
            <ul className="mt-5 space-y-3 text-xs tracking-[0.15em] text-cream/70">
              <li><a href="/collection" className="transition-colors hover:text-gold-light">HERITAGE GALLERY</a></li>
              <li><a href="/auctions" className="transition-colors hover:text-gold-light">LIVE AUCTIONS</a></li>
              <li><a href="/services" className="transition-colors hover:text-gold-light">CLEANING &amp; RESTORATION</a></li>
              <li><a href="/collection" className="transition-colors hover:text-gold-light">BESPOKE SOURCING</a></li>
              <li><a href="/#cities" className="transition-colors hover:text-gold-light">ABOUT OUR WEAVERS</a></li>
              <li><a href="/about" className="transition-colors hover:text-gold-light">ABOUT US</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-gold">
              INQUIRIES
            </p>
            <ul className="mt-5 space-y-3 text-xs tracking-[0.15em] text-cream/70">
              <li>{CONTACT.locationLong.toUpperCase()}</li>
              <li>
                <a href={CONTACT.emailHref} className="transition-colors hover:text-gold-light">
                  {CONTACT.email.toUpperCase()}
                </a>
              </li>
              <li dir="ltr">
                <a href={CONTACT.phoneHref} className="transition-colors hover:text-gold-light">
                  {CONTACT.phone}
                </a>
              </li>
              <li dir="ltr">
                <a
                  href={CONTACT.instagramHref}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-gold-light"
                >
                  {CONTACT.instagram.toUpperCase()}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-gold">
              CONNECT
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={CONTACT.instagramHref}
                target="_blank"
                rel="noreferrer"
                aria-label={`Instagram — ${CONTACT.instagram}`}
                className="rounded-full border border-cream/20 p-2 text-cream/70 transition-colors hover:border-gold hover:text-gold-light"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a href={CONTACT.emailHref} aria-label={`Email — ${CONTACT.email}`} className="rounded-full border border-cream/20 p-2 text-cream/70 transition-colors hover:border-gold hover:text-gold-light">
                <Mail className="h-4 w-4" />
              </a>
              <a href={CONTACT.phoneHref} aria-label={`Phone — ${CONTACT.phone}`} className="rounded-full border border-cream/20 p-2 text-cream/70 transition-colors hover:border-gold hover:text-gold-light">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gold/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-[10px] tracking-[0.25em] text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} ALBESAT CARPET. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8">
              <a href="#" className="transition-colors hover:text-gold-light">PRIVACY POLICY</a>
              <a href="#" className="transition-colors hover:text-gold-light">TERMS OF AUCTION</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Ornament() {
  return (
    <div className="flex items-center justify-center gap-4">
      <span className="h-px w-40 bg-gradient-to-r from-transparent to-gold/40 sm:w-72" />
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold/60" fill="none">
        <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="h-px w-40 bg-gradient-to-l from-transparent to-gold/40 sm:w-72" />
    </div>
  );
}
