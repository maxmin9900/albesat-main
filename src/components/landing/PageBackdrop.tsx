import type { ReactNode } from "react";

/**
 * A photograph held behind a whole page while its content scrolls over it.
 *
 * The image lives in a viewport-tall sticky layer rather than being stretched
 * over the page: the backgrounds are 1280×720, and `cover` over a page several
 * screens tall would blow them up five times over into a blur. It is also the
 * CSS-only stand-in for `background-attachment: fixed`, which iOS Safari
 * ignores.
 *
 * The layer is confined to this wrapper, so it never shows behind the footer,
 * and both ends fade into the page's own black so there is no hard seam.
 */
export default function PageBackdrop({
  src,
  children,
  /** how much of the photograph shows through — 0 is black, 1 is untouched */
  strength = 0.3,
  position = "center",
}: {
  src: string;
  children: ReactNode;
  strength?: number;
  position?: string;
}) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: position, opacity: strength }}
            draggable={false}
          />
          {/* keeps the middle of the frame quiet enough to read on */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,rgba(5,5,10,0.35),rgba(5,5,10,0.75))]" />
        </div>
        {/* the seams, softened into the page */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-void to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-void to-transparent" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
