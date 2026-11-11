"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";
import { isVideoUrl } from "@/lib/utils";

/**
 * Full-screen viewer for the carpets. One component, used everywhere a rug is
 * shown — the public archive, the piece page, the auction hall, the admin
 * panel — so every photograph on the site opens the same way.
 *
 * Two entry points:
 *   <Zoomable>   wraps a whole image/frame; clicking it opens the viewer
 *   <ZoomButton> a small corner button for images that are already links
 *                (cards that navigate) — expands without following the link
 *
 * Both take either a single `src` or an `items` list with an `index`, in
 * which case the viewer pages through the set (arrows, ← →) and shows a
 * counter. Videos play inline in the viewer.
 */

export type LightboxItem = { url: string; alt?: string };

type OpenProps = {
  src?: string;
  alt?: string;
  items?: LightboxItem[];
  index?: number;
  /** caption under the image, e.g. the piece's title */
  caption?: string;
};

function useLightbox({ src, alt, items, index = 0, caption }: OpenProps) {
  const list: LightboxItem[] = items && items.length > 0 ? items : src ? [{ url: src, alt }] : [];
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(index);
  const openAt = useCallback(() => {
    setI(Math.min(Math.max(index, 0), Math.max(list.length - 1, 0)));
    setOpen(true);
  }, [index, list.length]);
  const close = useCallback(() => setOpen(false), []);
  return { open, i, setI, openAt, close, list, caption };
}

/* ------------------------------------------------------------------ */
/*  the overlay                                                        */
/* ------------------------------------------------------------------ */

function Viewer({
  open,
  i,
  setI,
  close,
  list,
  caption,
}: ReturnType<typeof useLightbox>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Zoom lives here so the arrows and the Escape key can reset it. A carpet
  // is bought on its knot count, so the viewer has to let people in close.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const MAX = 6;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /**
   * Zoom while keeping whatever is under the cursor under the cursor.
   *
   * A point d away from the frame's centre sits at image coordinate
   * (d - pan) / zoom. Holding that fixed across a zoom change gives
   * pan2 = d - (d - pan1) * zoom2 / zoom1.
   */
  const zoomAt = useCallback(
    (next: number, cx: number, cy: number, rect: DOMRect) => {
      const z2 = Math.min(MAX, Math.max(1, next));
      setZoom((z1) => {
        setPan((p) => {
          if (z2 === 1) return { x: 0, y: 0 };
          const dx = cx - (rect.left + rect.width / 2);
          const dy = cy - (rect.top + rect.height / 2);
          const nx = dx - (dx - p.x) * (z2 / z1);
          const ny = dy - (dy - p.y) * (z2 / z1);
          // keep the picture from being dragged off the screen entirely
          const maxX = (rect.width * (z2 - 1)) / 2;
          const maxY = (rect.height * (z2 - 1)) / 2;
          return {
            x: Math.min(maxX, Math.max(-maxX, nx)),
            y: Math.min(maxY, Math.max(-maxY, ny)),
          };
        });
        return z2;
      });
    },
    []
  );

  const many = list.length > 1;
  const prev = useCallback(() => setI((v) => (v - 1 + list.length) % list.length), [list.length, setI]);
  const next = useCallback(() => setI((v) => (v + 1) % list.length), [list.length, setI]);

  // keyboard + scroll lock while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (many && e.key === "ArrowLeft") prev();
      else if (many && e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(MAX, z + 0.5));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
      else if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, many, prev, next, close, resetZoom]);

  // a fresh photograph always starts unzoomed
  useEffect(() => resetZoom(), [i, open, resetZoom]);

  // React attaches onWheel passively, where preventDefault is refused and the
  // page scrolls behind the viewer. Bind the listener directly so the wheel
  // zooms the carpet instead.
  const zoomRef = useRef(zoomAt);
  zoomRef.current = zoomAt;
  const curZoom = useRef(zoom);
  curZoom.current = zoom;
  useEffect(() => {
    const el = frameRef.current;
    if (!open || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomRef.current(curZoom.current * factor, e.clientX, e.clientY, rect);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, i]);

  if (!mounted) return null;
  const cur = list[i];

  return createPortal(
    <AnimatePresence>
      {open && cur && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={cur.alt ?? caption ?? "Image"}
        >
          {/* close */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full border border-gold/40 bg-void/70 p-2 text-gold-light transition-colors hover:bg-gold hover:text-void"
          >
            <X className="h-5 w-5" />
          </button>

          {/* prev / next */}
          {many && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gold/40 bg-void/70 p-3 text-gold-light transition-colors hover:bg-gold hover:text-void sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gold/40 bg-void/70 p-3 text-gold-light transition-colors hover:bg-gold hover:text-void sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* the image, as large as the screen allows, never cropped */}
          <motion.div
            key={cur.url}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex max-h-screen max-w-screen flex-col items-center px-4 py-14"
            onClick={(e) => e.stopPropagation()}
            ref={frameRef}
            style={{ touchAction: "none" }}
            onDoubleClick={(e) => {
              if (isVideoUrl(cur.url)) return;
              const rect = e.currentTarget.getBoundingClientRect();
              zoomAt(zoom > 1 ? 1 : 2.5, e.clientX, e.clientY, rect);
            }}
            onPointerDown={(e) => {
              if (zoom === 1 || isVideoUrl(cur.url)) return;
              (e.target as Element).setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const maxX = (rect.width * (zoom - 1)) / 2;
              const maxY = (rect.height * (zoom - 1)) / 2;
              setPan({
                x: Math.min(maxX, Math.max(-maxX, d.px + (e.clientX - d.x))),
                y: Math.min(maxY, Math.max(-maxY, d.py + (e.clientY - d.y))),
              });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onTouchStart={(e) => {
              if (e.touches.length !== 2 || isVideoUrl(cur.url)) return;
              const [a, b] = [e.touches[0], e.touches[1]];
              pinch.current = {
                dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                zoom,
              };
            }}
            onTouchMove={(e) => {
              const p = pinch.current;
              if (!p || e.touches.length !== 2) return;
              const [a, b] = [e.touches[0], e.touches[1]];
              const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
              const rect = e.currentTarget.getBoundingClientRect();
              zoomAt(
                (p.zoom * dist) / p.dist,
                (a.clientX + b.clientX) / 2,
                (a.clientY + b.clientY) / 2,
                rect
              );
            }}
            onTouchEnd={() => (pinch.current = null)}
          >
            {isVideoUrl(cur.url) ? (
              <video
                src={cur.url}
                controls
                autoPlay
                playsInline
                className="max-h-[84vh] max-w-[94vw] rounded-sm border border-gold/20 bg-void object-contain shadow-[0_0_80px_-10px_rgba(0,0,0,0.9)]"
              />
            ) : (
              /* The frame shrink-wraps the photograph and clips it, so a
                 zoomed carpet stays inside its border instead of spilling
                 over the caption and the controls below. */
              <div className="flex overflow-hidden rounded-sm border border-gold/20 shadow-[0_0_80px_-10px_rgba(0,0,0,0.9)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cur.url}
                  alt={cur.alt ?? caption ?? ""}
                  className={`max-h-[84vh] max-w-[94vw] object-contain ${
                    zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
                  }`}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: drag.current ? "none" : "transform 0.12s ease-out",
                  }}
                  draggable={false}
                />
              </div>
            )}
            {!isVideoUrl(cur.url) && (
              <div
                className="relative z-10 mt-4 flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  className="rounded-full border border-gold/30 p-2 text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="min-w-[4.5rem] rounded-full border border-gold/30 px-3 py-1.5 text-[11px] tracking-widest text-cream/80 transition-colors hover:border-gold hover:text-gold-light"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom >= MAX}
                  onClick={() => setZoom((z) => Math.min(MAX, z + 0.5))}
                  className="rounded-full border border-gold/30 p-2 text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}

            {(caption || many) && (
              <p className="mt-4 text-center text-[10px] tracking-[0.3em] text-cream/70">
                {caption ? caption.toUpperCase() : ""}
                {caption && many ? " · " : ""}
                {many ? `${i + 1} / ${list.length}` : ""}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*  entry points                                                       */
/* ------------------------------------------------------------------ */

/**
 * Wrap a frame or an image; clicking anywhere on it opens the viewer.
 * Renders a div with button semantics so any children (background-image
 * divs, motion elements, <img>) can go inside.
 */
export function Zoomable({
  children,
  className = "",
  title,
  ...props
}: OpenProps & { children: ReactNode; className?: string; title?: string }) {
  const lb = useLightbox(props);
  if (lb.list.length === 0) return <div className={className}>{children}</div>;
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        title={title ?? "View full size"}
        onClick={lb.openAt}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            lb.openAt();
          }
        }}
        className={`group/zoom relative cursor-zoom-in ${className}`}
      >
        {children}
        {/* a quiet hint on hover so people know it opens */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-gold/30 bg-void/70 px-2.5 py-1 text-[9px] tracking-[0.25em] text-gold-light opacity-0 backdrop-blur transition-opacity duration-300 group-hover/zoom:opacity-100"
        >
          <Maximize2 className="h-3 w-3" /> VIEW
        </span>
      </div>
      <Viewer {...lb} />
    </>
  );
}

/**
 * A small corner button for images that are already links (cards). Opens the
 * viewer without following the link.
 */
export function ZoomButton({
  className = "",
  ...props
}: OpenProps & { className?: string }) {
  const lb = useLightbox(props);
  if (lb.list.length === 0) return null;
  return (
    <>
      <button
        type="button"
        aria-label="View full size"
        title="View full size"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          lb.openAt();
        }}
        className={`absolute right-2 top-2 z-10 rounded-full border border-gold/40 bg-void/70 p-1.5 text-gold-light opacity-0 backdrop-blur transition-all duration-300 hover:bg-gold hover:text-void group-hover:opacity-100 focus:opacity-100 ${className}`}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <Viewer {...lb} />
    </>
  );
}
