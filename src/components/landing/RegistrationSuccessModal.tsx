"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { Invitation } from "@/lib/auction/invitation";
import { sessionDateLong } from "@/lib/auction/invitation";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** The house's eight-pointed star, the same one the services page uses. */
function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1l1.8 8.2L22 12l-8.2 1.8L12 23l-1.8-9.2L2 12l8.2-2.8L12 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

const HEADLINE = ["Registration", "Confirmed"];
// sparks fly off the seal as it presses down
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return { x: Math.cos(angle) * 96, y: Math.sin(angle) * 96, d: 0.5 + (i % 5) * 0.045 };
});

/**
 * The confirmation after registering for a sale.
 *
 * A wax seal presses into the page, its ornamental ring draws itself, the
 * tick strokes in, and the wording arrives word by word — the same
 * vocabulary as the loom on the collection page, so the moment feels like
 * part of the house rather than a browser alert.
 */
export default function RegistrationSuccessModal({
  open,
  invitation,
  onClose,
}: {
  open: boolean;
  /** the sale they just took a seat at — null if we somehow lost track */
  invitation: Invitation | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // Escape closes, the page behind does not scroll, and focus lands on the
  // close button so a keyboard is never stranded inside the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeRef.current?.focus(), 350);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  // with reduced motion the piece still appears, it simply does not perform
  const step = reduce ? 0 : 1;
  const date = sessionDateLong(invitation?.startAt ?? null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 px-5 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-success-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.7, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/30 bg-surface px-7 py-12 text-center shadow-[0_0_120px_-20px_rgba(201,162,75,0.45)] sm:px-12"
          >
            {/* a warm pool of light behind the seal */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_22%,rgba(201,162,75,0.16),transparent_70%)]"
            />

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full border border-gold/25 p-2 text-cream/60 transition-colors hover:border-gold hover:text-gold-light"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ——— the seal ——— */}
            <div className="relative mx-auto mb-8 h-28 w-28">
              {SPARKS.map((s, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: s.x * step,
                    y: s.y * step,
                    scale: [0, 1, 0.2],
                  }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: s.d * step }}
                  className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-gold-light"
                />
              ))}

              <motion.svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                initial={{ rotate: -90 * step }}
                animate={{ rotate: 0 }}
                transition={{ duration: 1.5, ease: EASE, delay: 0.15 * step }}
              >
                {/* the ring draws itself around the seal */}
                <motion.circle
                  cx="50" cy="50" r="46"
                  fill="none" stroke="currentColor"
                  className="text-gold/70"
                  strokeWidth="1.5"
                  strokeDasharray="289"
                  initial={{ strokeDashoffset: 289 * step }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.3, ease: EASE, delay: 0.2 * step }}
                />
                <motion.circle
                  cx="50" cy="50" r="40"
                  fill="none" stroke="currentColor"
                  className="text-gold/25"
                  strokeWidth="0.75"
                  strokeDasharray="4 5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7 * step }}
                />
              </motion.svg>

              {/* the wax presses in */}
              <motion.div
                initial={{ scale: 0.3 * (step || 3.33), opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: reduce ? "tween" : "spring",
                  stiffness: 200,
                  damping: 14,
                  duration: reduce ? 0.3 : undefined,
                  delay: 0.1 * step,
                }}
                className="absolute inset-[18%] flex items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dim shadow-[0_0_40px_-6px_rgba(230,198,122,0.7)]"
              >
                <svg viewBox="0 0 48 48" className="h-8 w-8">
                  <motion.path
                    d="M13 24.5l7.5 7.5L35 17"
                    fill="none"
                    stroke="#05050a"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="40"
                    initial={{ strokeDashoffset: 40 * step }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.55 * step }}
                  />
                </svg>
              </motion.div>

              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 1 * step }}
                className="absolute -right-1 -top-1 text-gold"
              >
                <Star className="h-5 w-5" />
              </motion.span>
            </div>

            {/* ——— the wording ——— */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.35em" }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.8 * step }}
              className="relative text-[10px] tracking-[0.35em] text-gold/70 ornament"
            >
              AUCTION REGISTRATION
            </motion.p>

            <h2
              id="reg-success-title"
              className="relative mt-5 font-display text-3xl leading-tight sm:text-4xl"
            >
              {HEADLINE.map((word, i) => (
                <span key={i}>
                  <motion.span
                    initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.9,
                      ease: EASE,
                      delay: (1 + i * 0.12) * step,
                    }}
                    className="inline-block text-gradient-gold-animated"
                  >
                    {word}
                  </motion.span>{" "}
                </span>
              ))}
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1.5 * step }}
              className="relative mx-auto mt-5 max-w-sm text-sm leading-relaxed text-cream/80"
            >
              Your seat has been reserved for the auction
              {invitation?.venueName ? ` at the ${invitation.venueName}` : ""}.
            </motion.p>

            {date && (
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE, delay: 1.62 * step }}
                className="relative mt-4 text-sm tracking-[0.2em] text-gold-light"
              >
                {date.toUpperCase()}
              </motion.p>
            )}

            <motion.span
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: EASE, delay: 1.74 * step }}
              className="relative mx-auto mt-7 block h-px w-32 origin-center bg-gradient-to-r from-transparent via-gold to-transparent"
            />

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1.86 * step }}
              className="relative mx-auto mt-7 max-w-sm text-sm leading-relaxed text-cream/70"
            >
              If you have registered an accompanying guest, their seat has
              also been reserved.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1.96 * step }}
              className="relative mx-auto mt-4 max-w-sm font-display text-lg text-silk"
            >
              We look forward to welcoming you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 2 * step }}
              className="relative mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <button
                type="button"
                onClick={onClose}
                className="btn-gold-shimmer w-full rounded-full border border-gold/60 bg-gold/5 px-8 py-3.5 text-xs tracking-[0.25em] text-gold-light transition-colors hover:bg-gold hover:text-void sm:w-auto"
              >
                BROWSE THE LOTS
              </button>
              <a
                href="/collection"
                className="w-full rounded-full border border-gold/25 px-8 py-3.5 text-xs tracking-[0.25em] text-cream/75 transition-colors hover:border-gold hover:text-gold-light sm:w-auto"
              >
                THE COLLECTION
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
