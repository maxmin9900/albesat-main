"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Sparkles,
  Wind,
  Frame,
  Scissors,
  Bug,
  Droplets,
  Waves,
  MoveHorizontal,
  Palette,
  LayoutGrid,
  Layers,
  Link2,
  FileText,
  ChevronRight,
  Plus,
  MapPin,
  Phone,
  Mail,
  Instagram,
  type LucideIcon,
} from "lucide-react";
import OmanMapPicker, { type OmanLatLng } from "./OmanMapPicker";
import {
  SERVICE_CATEGORIES,
  SERVICES_INTRO,
  type ServiceItem,
} from "@/lib/services-content";
import { CONTACT } from "@/lib/contact";
import { Zoomable } from "@/components/ui/Lightbox";

/* ------------------------------------------------------------------ */
/*  shared bits                                                        */
/* ------------------------------------------------------------------ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const ICONS: Record<string, LucideIcon> = {
  "professional-carpet-cleaning": Sparkles,
  "odor-elimination": Wind,
  "edges-renewal-repair": Frame,
  "fringes-renewal-repair": Scissors,
  "moth-damage-repair": Bug,
  "stain-color-bleeding-removal": Droplets,
  "water-damage-repair": Waves,
  "carpet-straightening": MoveHorizontal,
  "carpet-color-re-dyeing": Palette,
  "reweaving-damaged-rotten-areas": LayoutGrid,
  "installing-leather-trims": Layers,
  "installing-loops-hanging-rugs": Link2,
  "evaluation-insurance-assessments": FileText,
};

const ALL_SERVICES: ServiceItem[] = SERVICE_CATEGORIES.flatMap((c) => c.items);

/** The Figma star — a slim eight-pointed compass star in gold. */
function Star({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1l1.8 8.2L22 12l-8.2 1.8L12 23l-1.8-9.2L2 12l8.2-2.8L12 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1, ease: EASE }}
      className="text-center"
    >
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        className="inline-block text-gold"
      >
        <Star className="h-6 w-6" />
      </motion.span>
      {eyebrow && (
        <p className="mt-6 text-[11px] tracking-[0.4em] text-gold/70">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 font-display text-4xl text-silk sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-xs tracking-[0.25em] text-cream/70">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  const words = ["Our", "Professional", "Carpet", "Services"];
  return (
    <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_40%,rgba(201,162,75,0.09),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.4, rotate: -120 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1.6, ease: EASE }}
        className="text-gold"
      >
        <Star className="h-14 w-14" />
      </motion.div>

      {/* same display face as the section headings below — the word spans are
          inline-block for the stagger, so the spaces live outside them */}
      <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[1.15] text-silk sm:text-6xl md:text-7xl">
        {words.map((w, i) => (
          <span key={w}>
            <motion.span
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.35 + i * 0.16 }}
              className="inline-block"
            >
              {w}
            </motion.span>
            {i === 1 ? <br /> : " "}
          </span>
        ))}
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: 1.25 }}
        className="mt-9 text-xs tracking-[0.35em] text-gold"
      >
        AL BESAT AL HARIRI LLC · MUSCAT, OMAN
      </motion.p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  concierge request form — pre-filled from the ERP booking form      */
/* ------------------------------------------------------------------ */

function labelClass() {
  return "text-[10px] tracking-[0.3em] text-gold/80";
}
function fieldClass() {
  return "mt-3 w-full rounded-sm border border-gold/20 bg-void/50 px-4 py-3 text-cream placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none";
}

function ConciergeForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(ALL_SERVICES[0].title);
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<OmanLatLng | null>(null);
  const [tracking, setTracking] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resultTracking, setResultTracking] = useState<string | null>(null);

  // pre-fill from the query string carried over by the ERP booking form
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("name")) setName(q.get("name")!);
    if (q.get("phone")) setPhone(q.get("phone")!);
    if (q.get("email")) setEmail(q.get("email")!);
    if (q.get("notes")) setNotes(q.get("notes")!);
    if (q.get("tracking")) setTracking(q.get("tracking")!);

    const addr = q.get("address");
    const house = q.get("house");
    if (addr) setAddress(house ? `${addr} — No. ${house}` : addr);

    const lat = parseFloat(q.get("lat") ?? "");
    const lng = parseFloat(q.get("lng") ?? "");
    if (Number.isFinite(lat) && Number.isFinite(lng)) setCoords({ lat, lng });

    // map the ERP wash tiers onto our service list
    const s = (q.get("service") ?? "").toLowerCase();
    if (s) {
      const wash = ["standard", "premium", "antique"];
      if (wash.includes(s)) setService("Professional Carpet Cleaning");
      else {
        const match = ALL_SERVICES.find(
          (x) => x.slug === s || x.title.toLowerCase() === s
        );
        if (match) setService(match.title);
      }
    }

    // arriving pre-filled from the ERP booking form? the form now lives lower
    // on the page, so bring it into view.
    if (q.get("tracking") || q.get("name") || q.get("phone")) {
      window.setTimeout(() => {
        document
          .getElementById("request")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  }, []);

  // Submits straight into the Albesat ERP: the request is created as a new
  // order (source = Website) and appears in the admin panel's Orders tab.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (name.trim().length < 2) {
      setFormError("Please enter your full name.");
      return;
    }
    if (phone.trim().length < 8) {
      setFormError("Please enter a valid Oman phone number (+968…).");
      return;
    }
    if (!coords) {
      setFormError("Please tap your pickup location on the map.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          phone,
          email,
          service,
          notes: tracking ? `${notes}\nBooking ref: ${tracking}`.trim() : notes,
          address,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { tracking_code?: string | null; error?: string }
        | null;
      if (!res.ok) {
        setFormError(data?.error ?? "Something went wrong — please try again.");
        return;
      }
      setResultTracking(data?.tracking_code ?? null);
      setSent(true);
    } catch {
      setFormError("Connection failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="request" className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 1, ease: EASE }}
        className="relative overflow-hidden rounded-lg border border-gold/20 bg-[linear-gradient(160deg,rgba(40,28,12,0.55),rgba(10,10,18,0.6))] p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-10"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 text-gold/5">
          <Star className="h-56 w-56" />
        </div>

        <div className="relative flex flex-col gap-2 border-b border-gold/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-gold/80">
              CONCIERGE REQUEST
            </p>
            <h3 className="mt-2 font-display text-3xl text-silk">
              Request a Service
            </h3>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-cream/60">
            Share a few details and our Muscat team will arrange inspection,
            pickup, and the correct treatment path.
          </p>
        </div>

        {tracking && (
          <p className="relative mt-5 rounded-sm border border-gold/25 bg-gold/5 px-4 py-3 text-xs tracking-wide text-gold-light">
            Booking <strong>{tracking}</strong> received — complete your service
            request below and our concierge will follow up.
          </p>
        )}

        {sent ? (
          <div className="relative mt-8 rounded-sm border border-gold/30 bg-gold/5 p-6 text-center text-cream/85">
            <p>
              Thank you — your request has been received. Our Muscat concierge
              will be in touch within 30 minutes.
            </p>
            {resultTracking && (
              <p className="mt-4 text-sm tracking-wide">
                Your tracking code:{" "}
                <strong className="text-gold-light">#{resultTracking}</strong>
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="relative mt-7 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass()}>FULL NAME</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={fieldClass()}
                />
              </label>
              <label className="block">
                <span className={labelClass()}>PHONE NUMBER</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+968 …"
                  className={fieldClass()}
                />
              </label>
              <label className="block">
                <span className={labelClass()}>EMAIL ADDRESS</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={fieldClass()}
                />
              </label>
              <label className="block">
                <span className={labelClass()}>SELECT SERVICE</span>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={`${fieldClass()} appearance-none`}
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.title} label={cat.title}>
                      {cat.items.map((it) => (
                        <option key={it.slug} value={it.title}>
                          {it.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className={labelClass()}>CARPET DESCRIPTION / NOTES</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Material, size, visible damage, odor, stain location, or service notes"
                className={`${fieldClass()} resize-none`}
              />
            </label>

            <div>
              <span className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-gold/80">
                <MapPin className="h-3.5 w-3.5" /> PICKUP LOCATION — SELECT ON
                MAP
              </span>
              <div className="mt-3">
                <OmanMapPicker
                  initial={coords}
                  initialAddress={address}
                  onSelect={(addr, c) => {
                    setAddress(addr);
                    if (c) setCoords(c);
                  }}
                />
              </div>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-sm border border-crimson/40 bg-crimson/10 px-4 py-3 text-xs tracking-wide text-crimson-light"
              >
                {formError}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.01 }}
              whileTap={{ scale: submitting ? 1 : 0.99 }}
              className="w-full rounded-sm bg-crimson py-4 text-xs tracking-[0.35em] text-silk shadow-[0_0_30px_-8px_rgba(139,30,45,0.8)] transition-colors hover:bg-crimson-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "SUBMITTING…" : "SUBMIT REQUEST"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  services grid — category sections of cards                         */
/* ------------------------------------------------------------------ */

function ServiceCard({
  item,
  category,
  index,
  onLearnMore,
}: {
  item: ServiceItem;
  category: string;
  index: number;
  onLearnMore: (slug: string) => void;
}) {
  const Icon = ICONS[item.slug] ?? Sparkles;
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: EASE, delay: (index % 3) * 0.1 }}
      whileHover={{ y: -6 }}
      className="group relative border border-gold/15 bg-space/70 p-7 transition-colors hover:border-gold/45"
    >
      {/* left accent that grows on hover */}
      <span className="absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-gradient-to-b from-gold-light to-transparent transition-transform duration-500 group-hover:scale-y-100" />
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.25em] text-gold/70">
          {category.toUpperCase()}
        </p>
        <Icon className="h-5 w-5 text-gold/60 transition-colors group-hover:text-gold" />
      </div>
      <h4 className="mt-4 font-display text-2xl text-silk">{item.title}</h4>
      <p className="mt-3 text-sm leading-relaxed text-cream/60">{item.short}</p>
      <button
        type="button"
        onClick={() => onLearnMore(item.slug)}
        className="mt-6 inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] text-gold transition-colors hover:text-gold-light"
      >
        LEARN MORE
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </button>
    </motion.article>
  );
}

function OurServices({ onLearnMore }: { onLearnMore: (slug: string) => void }) {
  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: EASE }}
      >
        <p className="text-[11px] tracking-[0.4em] text-gold/70">
          SPECIALIZED CARE
        </p>
        <h2 className="mt-4 font-display text-5xl text-silk">Our Services</h2>
        <p className="mt-6 max-w-3xl leading-relaxed text-cream/70">
          {SERVICES_INTRO}
        </p>
      </motion.div>

      {SERVICE_CATEGORIES.map((cat) => (
        <div key={cat.title} className="mt-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.9, ease: EASE }}
            className="flex items-center gap-5"
          >
            <span className="gold-rule w-full" />
            <h3 className="whitespace-nowrap font-display text-2xl italic text-gradient-gold-animated">
              {cat.title}
            </h3>
          </motion.div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((item, i) => (
              <ServiceCard
                key={item.slug}
                item={item}
                category={cat.title}
                index={i}
                onLearnMore={onLearnMore}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  service details — accordion (+ opens the answer)                   */
/* ------------------------------------------------------------------ */

function DetailRow({
  item,
  open,
  onToggle,
  rowRef,
}: {
  item: ServiceItem;
  open: boolean;
  onToggle: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`scroll-mt-28 border transition-colors ${
        open ? "border-gold/45 bg-space/60" : "border-gold/15 bg-space/30"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span
          className={`font-display text-xl transition-colors ${
            open ? "text-gold-light" : "text-silk"
          }`}
        >
          {item.title}
        </span>
        <motion.span
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border ${
            open ? "border-gold text-gold" : "border-gold/40 text-gold/70"
          }`}
        >
          <Plus className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-gold/15 px-6 pb-8 pt-6">
              {item.answer.map((p, k) =>
                typeof p === "string" ? (
                  <p key={k} className="text-sm leading-relaxed text-cream/70">
                    {p}
                  </p>
                ) : (
                  <p key={k} className="text-sm leading-relaxed text-cream/70">
                    <span className="text-gold-light">{p.label}:</span>{" "}
                    {p.text}
                  </p>
                )
              )}

              {/* preload="none": the clip is only fetched if the visitor
                  actually presses play, and the element itself only exists
                  while this row is open */}
              {item.video && (
                <video
                  src={item.video}
                  controls
                  playsInline
                  preload="none"
                  className="mt-2 w-full rounded-sm border border-gold/20 bg-void"
                />
              )}

              {/* a still, for a service shown better by one photograph than by
                  footage — click to open it full size */}
              {item.image && (
                <Zoomable
                  items={[{ url: item.image, alt: item.title }]}
                  caption={item.title}
                  className="mt-2 overflow-hidden rounded-sm border border-gold/20 bg-void"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="w-full"
                    draggable={false}
                  />
                </Zoomable>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceDetails({
  openSlug,
  setOpenSlug,
  registerRow,
}: {
  openSlug: string | null;
  setOpenSlug: (s: string | null) => void;
  registerRow: (slug: string, el: HTMLDivElement | null) => void;
}) {
  return (
    <section
      id="service-details"
      className="mx-auto max-w-4xl scroll-mt-24 px-6 py-24"
    >
      <SectionHead
        title="Service Details"
        subtitle="FULL TREATMENT NOTES, PROCESS SUMMARIES, AND CARE GUIDANCE FOR EACH ALBESAT SERVICE."
      />
      <div className="mt-14 space-y-3">
        {ALL_SERVICES.map((item) => (
          <DetailRow
            key={item.slug}
            item={item}
            open={openSlug === item.slug}
            onToggle={() =>
              setOpenSlug(openSlug === item.slug ? null : item.slug)
            }
            rowRef={(el) => registerRow(item.slug, el)}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  muscat concierge contact                                           */
/* ------------------------------------------------------------------ */

function ConciergeContact() {
  const rows = [
    { icon: Phone, label: CONTACT.phone, href: CONTACT.phoneHref },
    { icon: Mail, label: CONTACT.email, href: CONTACT.emailHref },
    { icon: Instagram, label: CONTACT.instagram, href: CONTACT.instagramHref },
    { icon: MapPin, label: CONTACT.location, href: undefined as string | undefined },
  ];
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 1, ease: EASE }}
        className="grid gap-8 border border-gold/15 bg-space/50 p-9 sm:grid-cols-2 sm:items-center"
      >
        <div>
          <p className="text-[10px] tracking-[0.35em] text-gold/80">
            MUSCAT CONCIERGE
          </p>
          <h3 className="mt-3 font-display text-3xl leading-snug text-silk">
            Arrange pickup, inspection, or private service advice.
          </h3>
        </div>
        <ul className="space-y-4">
          {rows.map((r) => {
            const inner = (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 text-gold/80">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="text-sm tracking-wide text-cream/80">
                  {r.label}
                </span>
              </>
            );
            return (
              <li key={r.label}>
                {r.href ? (
                  <a
                    href={r.href}
                    className="group flex items-center gap-3 transition-colors hover:text-gold-light"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex items-center gap-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export default function ServicesShowcase() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const rowEls = useRef<Record<string, HTMLDivElement | null>>({});

  const learnMore = (slug: string) => {
    setOpenSlug(slug);
    // let the accordion open, then bring the row into view
    window.setTimeout(() => {
      rowEls.current[slug]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  return (
    <>
      <Hero />
      <OurServices onLearnMore={learnMore} />
      {/* the concierge form now sits near the foot of the page, right before
          the Service Details accordion */}
      <ConciergeForm />
      <ServiceDetails
        openSlug={openSlug}
        setOpenSlug={setOpenSlug}
        registerRow={(slug, el) => {
          rowEls.current[slug] = el;
        }}
      />
      <ConciergeContact />
    </>
  );
}
