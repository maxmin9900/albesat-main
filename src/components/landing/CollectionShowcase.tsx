"use client";

import { motion } from "framer-motion";
import { ZoomButton } from "@/components/ui/Lightbox";

export type ShowcaseItem = {
  id: string;
  title: string;
  city: string;
  code: string;
  price: string;
  currency: string;
  image: string;
};

export default function CollectionShowcase({
  items,
}: {
  items: ShowcaseItem[];
}) {
  return (
    <section
      id="collection"
      className="relative z-20 -mt-[100vh] w-full px-6 py-28"
    >
      {/* Scene 8 — no section feeling: this overlaps the still-pinned woven
          carpet, so the gallery rises straight off the carpet's surface and
          only gradually settles onto its own dark ground. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,10,0)_0,rgba(5,5,10,0.78)_45vh,#05050a_95vh)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, margin: "-60px" }}
          className="mb-16 text-center"
        >
          <p className="text-sm tracking-[0.4em] text-gold/60 ornament">
            THE COLLECTION
          </p>
          <h2 className="mt-4 font-display text-4xl text-silk sm:text-6xl">
            Featured Works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/60">
            One masterpiece from each of the six carpet cities — open a card to
            explore that city&apos;s full collection.
          </p>
        </motion.div>

        {items.length === 0 ? (
          <p className="text-center text-muted">
            No works published yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <motion.a
                key={item.id}
                href={`/collection?city=${item.city.toLowerCase()}`}
                initial={{ opacity: 0, y: 90 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 1.3,
                  ease: [0.22, 1, 0.36, 1],
                  delay: (i % 3) * 0.18,
                }}
                viewport={{ once: true, margin: "-80px" }}
                className="group relative block overflow-hidden rounded-lg border border-gold/10 bg-surface"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <div
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                  <ZoomButton src={item.image} alt={item.title} caption={item.title} className="right-auto left-2" />
                  <span className="absolute right-4 top-4 rounded-full border border-gold/30 bg-void/60 px-3 py-1 text-xs text-gold-light backdrop-blur">
                    {item.city}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-widest text-muted">
                    {item.code}
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-silk transition-colors group-hover:text-gold-light">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-gold">
                    {formatPrice(item.price, item.currency)}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <a
            href="/collection"
            className="inline-block rounded-full border border-gold px-8 py-3 text-gold transition-colors hover:bg-gold hover:text-void"
          >
            View full collection
          </a>
        </div>
      </div>
    </section>
  );
}

function formatPrice(price: string, currency: string) {
  const symbol =
    { OMR: "OMR ", IRR: "﷼", USD: "$", EUR: "€", AED: "د.إ" }[currency] ??
    currency;
  const n = new Intl.NumberFormat("en-US").format(Number(price));
  return `${symbol}${n}`;
}
