import type Lenis from "lenis";

// Shared reference to the active Lenis smooth-scroll instance so that
// components outside <SmoothScroll> (nav, buttons) can drive scrolling.
let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

export function getLenis(): Lenis | null {
  return instance;
}

export function scrollToTarget(
  target: string | HTMLElement | number,
  opts?: { offset?: number; duration?: number }
) {
  if (instance) {
    instance.scrollTo(target, opts);
    return;
  }
  // fallback without Lenis
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    const el =
      typeof target === "string" ? document.querySelector(target) : target;
    (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth" });
  }
}
