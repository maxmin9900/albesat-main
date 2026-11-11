"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  The loom — a scroll-driven 2D-canvas weaving engine.               */
/*  Warp threads rise, weft silk interlocks row by row from the loom's */
/*  base, the city's motif "cartoon" guides the weaver, and the real   */
/*  carpet photograph is literally woven into view — never faded in.   */
/* ------------------------------------------------------------------ */

type MotifKind = "herati" | "medallion" | "silk" | "eslimi" | "garden" | "baluch";

type WeaveStyle = {
  motif: MotifKind;
  /** silk colours the weft dashes & sparks cycle through */
  threads: string[];
  motifColor: string;
  /** extra floating lustre for pure-silk carpets */
  shimmer?: boolean;
};

export const WEAVE_STYLES: Record<string, WeaveStyle> = {
  tabriz: {
    motif: "herati",
    threads: ["#b7893c", "#8b1e2d", "#1d5c78", "#e6c67a"],
    motifColor: "#e6c67a",
  },
  qom: {
    motif: "silk",
    threads: ["#f6ecd6", "#e6c67a", "#d8cbb0", "#fff3cf"],
    motifColor: "#f0e6d2",
    shimmer: true,
  },
  kashan: {
    motif: "medallion",
    threads: ["#e6c67a", "#f0e6d2", "#8b1e2d", "#c9a24b"],
    motifColor: "#e6c67a",
  },
  shiraz: {
    motif: "garden",
    threads: ["#4a7043", "#c9a24b", "#b8323f", "#e0d3b0"],
    motifColor: "#dfc98a",
  },
  mashhad: {
    motif: "eslimi",
    threads: ["#8b1e2d", "#c9a24b", "#3fa8a0", "#5c1220"],
    motifColor: "#e6c67a",
  },
  // the five origins added later — each borrows the motif family closest to
  // its own weaving tradition
  tehran: {
    motif: "medallion",
    threads: ["#c9a24b", "#e0d3b0", "#7a2233", "#e6c67a"],
    motifColor: "#e6c67a",
  },
  nain: {
    motif: "silk",
    threads: ["#f2ead8", "#cfd8dd", "#1d5c78", "#e6c67a"],
    motifColor: "#eae0c8",
    shimmer: true,
  },
  esfahan: {
    motif: "eslimi",
    threads: ["#1d5c78", "#e6c67a", "#f0e6d2", "#8b1e2d"],
    motifColor: "#e6c67a",
    shimmer: true,
  },
  turkaman: {
    motif: "baluch",
    threads: ["#7a2018", "#a8412a", "#1f1410", "#d9a86c"],
    motifColor: "#d9a86c",
  },
  kerman: {
    motif: "garden",
    threads: ["#4a7043", "#d8cbb0", "#b8323f", "#c9a24b"],
    motifColor: "#dfc98a",
  },
  baluch: {
    motif: "baluch",
    threads: ["#a34a24", "#7a2e1d", "#c98d4b", "#3a2a1a"],
    motifColor: "#c98d4b",
  },
};

export const WEAVE_CAPTIONS: Record<string, string> = {
  tabriz: "TABRIZ · MAHI & HERATI, KNOTTED IN SILK",
  qom: "QOM · PURE SILK, WOVEN LIGHT",
  kashan: "KASHAN · LACHAK-TORANJ IN GOLDEN SILK",
  shiraz: "SHIRAZ · A PERSIAN GARDEN IN BLOOM",
  mashhad: "MASHHAD · ESLIMI OF THE GOLDEN DOME",
  tehran: "TEHRAN · THE CAPITAL'S COURT MEDALLION",
  nain: "NAIN · IVORY AND LAPIS, WOVEN IN SILK",
  esfahan: "ESFAHAN · ESLIMI OF THE ROYAL SQUARE",
  turkaman: "TURKAMAN · GÖL MEDALLIONS IN MADDER RED",
  kerman: "KERMAN · THE GARDEN OF LAVAR",
  baluch: "BALUCH · TRIBAL GEOMETRY, DESERT WARMTH",
};

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* ---- the weaver's cartoon: per-city motif line-work --------------- */

function drawMotif(cnv: HTMLCanvasElement, W: number, H: number, style: WeaveStyle) {
  cnv.width = Math.max(1, Math.floor(W));
  cnv.height = Math.max(1, Math.floor(H));
  const c = cnv.getContext("2d");
  if (!c) return;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = style.motifColor;
  c.fillStyle = style.motifColor;
  c.lineWidth = 1.1;

  const cx = W / 2;
  const cy = H / 2;
  const m = Math.min(W, H);

  // every carpet carries its twin guard borders
  c.globalAlpha = 0.9;
  c.strokeRect(W * 0.04, H * 0.05, W * 0.92, H * 0.9);
  c.globalAlpha = 0.45;
  c.strokeRect(W * 0.055, H * 0.07, W * 0.89, H * 0.86);
  c.globalAlpha = 0.85;

  switch (style.motif) {
    case "medallion": {
      // lachak-toranj: central medallion, pendants, quarter-corner lachaks
      c.beginPath();
      c.ellipse(cx, cy, m * 0.26, m * 0.36, 0, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(cx, cy, m * 0.19, m * 0.27, 0, 0, Math.PI * 2);
      c.stroke();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const px = cx + Math.cos(a) * m * 0.26 * 1.06;
        const py = cy + Math.sin(a) * m * 0.36 * 1.06;
        c.beginPath();
        c.arc(px, py, m * 0.022, 0, Math.PI * 2);
        c.stroke();
      }
      // pendants
      for (const s of [-1, 1]) {
        const py = cy + s * m * 0.42;
        c.beginPath();
        c.moveTo(cx, cy + s * m * 0.36);
        c.lineTo(cx, py);
        c.stroke();
        c.beginPath();
        c.moveTo(cx, py - m * 0.03);
        c.lineTo(cx + m * 0.025, py);
        c.lineTo(cx, py + m * 0.03);
        c.lineTo(cx - m * 0.025, py);
        c.closePath();
        c.stroke();
      }
      // corner lachaks
      for (const [ox, oy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
        c.beginPath();
        c.arc(ox, oy, m * 0.3, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(ox, oy, m * 0.24, 0, Math.PI * 2);
        c.stroke();
      }
      break;
    }
    case "herati": {
      // the mahi lattice: diamonds flanked by curved fish-leaves
      const step = m / 6.5;
      for (let y = H * 0.14; y < H * 0.88; y += step) {
        for (let x = W * 0.1 + ((Math.round(y / step) % 2) * step) / 2; x < W * 0.9; x += step) {
          const s = step * 0.36;
          c.beginPath();
          c.moveTo(x, y - s);
          c.lineTo(x + s, y);
          c.lineTo(x, y + s);
          c.lineTo(x - s, y);
          c.closePath();
          c.stroke();
          // fish (mahi) arcs curling round the diamond
          c.beginPath();
          c.arc(x, y - step * 0.16, step * 0.3, Math.PI * 0.15, Math.PI * 0.85);
          c.stroke();
          c.beginPath();
          c.arc(x, y + step * 0.16, step * 0.3, Math.PI * 1.15, Math.PI * 1.85);
          c.stroke();
          c.beginPath();
          c.arc(x, y, 1.6, 0, Math.PI * 2);
          c.fill();
        }
      }
      break;
    }
    case "silk": {
      // Qom: a fine sun medallion with radiating silk rays
      c.beginPath();
      c.ellipse(cx, cy, m * 0.17, m * 0.24, 0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.35;
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * m * 0.12, cy + Math.sin(a) * m * 0.17);
        c.lineTo(cx + Math.cos(a) * m * 0.34, cy + Math.sin(a) * m * 0.44);
        c.stroke();
      }
      c.globalAlpha = 0.85;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        c.beginPath();
        c.arc(cx + Math.cos(a) * m * 0.28, cy + Math.sin(a) * m * 0.38, m * 0.018, 0, Math.PI * 2);
        c.stroke();
      }
      break;
    }
    case "eslimi": {
      // Mashhad: the shrine's pointed arch with arabesque scrolls
      c.beginPath();
      c.moveTo(cx - m * 0.3, cy + m * 0.35);
      c.bezierCurveTo(cx - m * 0.3, cy - m * 0.1, cx - m * 0.12, cy - m * 0.34, cx, cy - m * 0.42);
      c.bezierCurveTo(cx + m * 0.12, cy - m * 0.34, cx + m * 0.3, cy - m * 0.1, cx + m * 0.3, cy + m * 0.35);
      c.stroke();
      c.beginPath();
      c.moveTo(cx, cy - m * 0.42);
      c.lineTo(cx, cy - m * 0.48);
      c.stroke();
      // arabesque spirals
      for (let s = 0; s < 6; s++) {
        const ox = cx + Math.cos((s / 6) * Math.PI * 2) * m * 0.19;
        const oy = cy + Math.sin((s / 6) * Math.PI * 2) * m * 0.24;
        c.beginPath();
        for (let q = 0; q <= 40; q++) {
          const th = (q / 40) * Math.PI * 3.2;
          const r = th * m * 0.011;
          const px = ox + Math.cos(th + s) * r;
          const py = oy + Math.sin(th + s) * r;
          if (q === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
      }
      break;
    }
    case "garden": {
      // Shiraz: the chahar-bagh — garden plots, a stream, small blossoms
      const gx = W * 0.12, gy = H * 0.12, gw = W * 0.76, gh = H * 0.76;
      for (let r = 0; r < 3; r++) {
        for (let q = 0; q < 2; q++) {
          c.strokeRect(
            gx + q * (gw / 2) + gw * 0.02,
            gy + r * (gh / 3) + gh * 0.015,
            gw / 2 - gw * 0.04,
            gh / 3 - gh * 0.03
          );
        }
      }
      // the stream down the middle
      c.beginPath();
      for (let y = gy; y <= gy + gh; y += 6) {
        const px = cx + Math.sin(y * 0.05) * m * 0.012;
        if (y === gy) c.moveTo(px, y);
        else c.lineTo(px, y);
      }
      c.stroke();
      // blossoms at the plot corners
      for (let r = 0; r <= 3; r++) {
        for (let q = 0; q <= 2; q++) {
          const fx = gx + q * (gw / 2);
          const fy = gy + r * (gh / 3);
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            c.beginPath();
            c.arc(fx + Math.cos(a) * m * 0.014, fy + Math.sin(a) * m * 0.014, m * 0.008, 0, Math.PI * 2);
            c.stroke();
          }
        }
      }
      break;
    }
    case "baluch": {
      // Sistan: stepped diamonds and zigzag columns, all straight lines
      for (let col = 0; col < 5; col++) {
        const x0 = W * (0.16 + col * 0.17);
        c.beginPath();
        for (let y = H * 0.1; y <= H * 0.9; y += H * 0.05) {
          const px = x0 + (Math.round(y / (H * 0.05)) % 2 === 0 ? -1 : 1) * W * 0.02;
          if (y === H * 0.1) c.moveTo(px, y);
          else c.lineTo(px, y);
        }
        c.stroke();
      }
      const step = m / 5;
      for (let y = H * 0.2; y < H * 0.85; y += step) {
        for (let x = W * 0.2; x < W * 0.85; x += step) {
          // stepped diamond
          const s = step * 0.24;
          c.beginPath();
          c.moveTo(x, y - s);
          c.lineTo(x + s * 0.5, y - s * 0.5);
          c.lineTo(x + s, y);
          c.lineTo(x + s * 0.5, y + s * 0.5);
          c.lineTo(x, y + s);
          c.lineTo(x - s * 0.5, y + s * 0.5);
          c.lineTo(x - s, y);
          c.lineTo(x - s * 0.5, y - s * 0.5);
          c.closePath();
          c.stroke();
        }
      }
      break;
    }
  }
}

/* ------------------------------------------------------------------ */

type Spark = {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
};

export default function CarpetWeave({
  progress,
  cityKey,
  image,
}: {
  /** 0 → 1 weaving progress, driven by the section's scroll timeline */
  progress: MotionValue<number>;
  cityKey: string;
  image: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pRef = useRef(progress.get());
  useMotionValueEvent(progress, "change", (v) => {
    pRef.current = v;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const style = WEAVE_STYLES[cityKey] ?? WEAVE_STYLES.kashan;

    let W = 0;
    let H = 0;
    let warpXs: number[] = [];
    let edgeNoise: number[] = [];
    const motifCanvas = document.createElement("canvas");

    const img = new Image();
    let imgReady = false;
    img.onload = () => (imgReady = true);
    /**
     * A missing photograph used to leave the loom weaving nothing: the warp
     * and the weft still drew, but no carpet ever appeared behind them and
     * the centrepiece of the page looked broken with no clue why. Fall back
     * through the older art, then give up quietly.
     */
    const fallbacks = [
      `/carpets/${cityKey}-1.jpg`,
      `/carpets/${cityKey}.jpg`,
    ].filter((f) => f !== image);
    img.onerror = () => {
      const next = fallbacks.shift();
      if (next) {
        console.warn(`[loom] ${img.src} did not load — trying ${next}`);
        img.src = next;
      } else {
        console.warn(`[loom] no carpet image available for "${cityKey}"`);
      }
    };
    img.src = image;

    // pointer → very subtle parallax once the carpet is complete
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);

    const sparks: Spark[] = [];
    const dust = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.8 + Math.random() * 1.5,
      sp: 0.05 + Math.random() * 0.2,
      ph: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = r.width;
      H = r.height;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      warpXs = [];
      for (let x = 3.5; x < W; x += 7) warpXs.push(x + (Math.random() - 0.5) * 1.6);
      edgeNoise = [];
      for (let x = 0; x <= W + 6; x += 6) {
        edgeNoise.push(
          (Math.sin(x * 0.05) + Math.sin(x * 0.013 + 2)) * 3 + (Math.random() - 0.5) * 4
        );
      }
      drawMotif(motifCanvas, W, H, style);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const coverImage = (offX: number, offY: number) => {
      if (!imgReady || !img.width) return;
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (W - dw) / 2 + offX, (H - dh) / 2 + offY, dw, dh);
    };

    let raf = 0;
    let last = performance.now();
    let cleared = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const p = pRef.current;

      if (p <= 0) {
        if (!cleared) {
          ctx.clearRect(0, 0, W, H);
          cleared = true;
        }
        return;
      }
      cleared = false;

      const warpP = clamp(p / 0.16);
      const weftP = clamp((p - 0.12) / 0.73);
      const doneP = clamp((p - 0.85) / 0.15); // scene 7 — the camera lands

      ctx.fillStyle = "#05050a";
      ctx.fillRect(0, 0, W, H);

      const parX = mouse.x * 14 * doneP;
      const parY = mouse.y * 10 * doneP;

      /* — warp: vertical silk threads rise across the loom — */
      const warpAlphaBase = 0.32 * (1 - doneP);
      if (warpAlphaBase > 0.004) {
        const nVisible = easeOut(warpP) * warpXs.length;
        ctx.lineWidth = 1;
        for (let i = 0; i < warpXs.length; i++) {
          const a = clamp(nVisible - i) * warpAlphaBase;
          if (a <= 0.004) continue;
          const x = warpXs[i] + Math.sin(t * 0.5 + i * 0.7) * 0.6;
          ctx.strokeStyle = `rgba(201,162,75,${a})`;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      }

      /* — the woven carpet grows upward from the loom's base — */
      const edgeY = H - weftP * (H + 26) + 13; // overshoot so the last rows finish clean
      if (weftP > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, H + 2);
        for (let k = 0; k < edgeNoise.length; k++) {
          ctx.lineTo(k * 6, edgeY + edgeNoise[k] * (1 - doneP));
        }
        ctx.lineTo(W + 2, H + 2);
        ctx.closePath();
        ctx.clip();
        coverImage(parX, parY);
        // freshly-woven rows still show the loom's grain
        const grain = 1 - doneP;
        if (grain > 0.02) {
          ctx.lineWidth = 1;
          for (let r = 0; r < 12; r++) {
            const y = edgeY + 4 + r * 6;
            if (y > H) break;
            ctx.strokeStyle = `rgba(5,5,10,${0.28 * (1 - r / 12) * grain})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      /* — the active weft: silk dashes interlocking over & under — */
      if (weftP > 0 && weftP < 1) {
        const rowH = 6;
        const rowsDone = (weftP * (H + 26)) / rowH;
        const rowFrac = rowsDone - Math.floor(rowsDone);
        for (let row = 0; row < 3; row++) {
          const y = edgeY - row * rowH - rowH / 2;
          if (y < -rowH || y > H + rowH) continue;
          const rowIndex = Math.floor(rowsDone) + row;
          const dir = rowIndex % 2 === 0 ? 1 : -1;
          const fill = row === 0 ? rowFrac : 1;
          const dash = 9;
          const limit = W * fill;
          for (let x = 0; x < limit; x += dash) {
            const j = Math.floor(x / dash);
            const over = (j + rowIndex) % 2 === 0;
            const color = style.threads[(j + rowIndex) % style.threads.length];
            const px = dir > 0 ? x : W - x - dash;
            // an occasional hand-tied slub, so nothing reads machine-made
            const slub = (j * 7 + rowIndex * 13) % 97 < 5 ? 1.6 : 0;
            ctx.globalAlpha = (over ? 0.95 : 0.42) * (1 - doneP);
            ctx.fillStyle = color;
            ctx.fillRect(px, y - 1.5 - slub / 2, dash - 1.4, 3 + slub);
          }
        }
        ctx.globalAlpha = 1;

        /* — the shuttle: a glowing tip carrying the silk across — */
        const topRowIndex = Math.floor(rowsDone);
        const dir = topRowIndex % 2 === 0 ? 1 : -1;
        const tipX = dir > 0 ? W * rowFrac : W * (1 - rowFrac);
        const tipY = edgeY - rowH / 2;
        const g = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 26);
        g.addColorStop(0, "rgba(255,244,208,0.9)");
        g.addColorStop(0.35, "rgba(230,198,122,0.45)");
        g.addColorStop(1, "rgba(230,198,122,0)");
        ctx.fillStyle = g;
        ctx.fillRect(tipX - 26, tipY - 26, 52, 52);

        // golden sparks fly from the working threads
        if (sparks.length < 130 && Math.random() < 0.55) {
          sparks.push({
            x: tipX,
            y: tipY,
            vx: (Math.random() - 0.5) * 46 - dir * 18,
            vy: -(12 + Math.random() * 42),
            life: 0,
            max: 0.6 + Math.random() * 0.7,
            size: 1 + Math.random() * 1.8,
            color: style.threads[Math.floor(Math.random() * style.threads.length)],
          });
        }
      }

      /* — the weaver's cartoon floats over the unwoven warp — */
      const motifRise = clamp((p - 0.14) / 0.12);
      const motifAlpha = 0.5 * motifRise * (1 - doneP);
      if (motifAlpha > 0.01 && edgeY > 4) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, Math.min(edgeY + 4, H));
        ctx.clip();
        ctx.globalAlpha = motifAlpha * (0.85 + 0.15 * Math.sin(t * 1.1));
        ctx.drawImage(motifCanvas, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      /* — sparks — */
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.max) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 55 * dt;
        const a = 1 - s.life / s.max;
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      /* — floating golden dust, always breathing — */
      for (const d of dust) {
        const y = ((d.y - t * d.sp * 0.012) % 1 + 1) % 1;
        const a = 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.8 + d.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#e6c67a";
        ctx.fillRect(d.x * W + Math.sin(t * 0.3 + d.ph) * 6, y * H, d.s, d.s);
      }
      // pure-silk carpets get an extra drifting lustre
      if (style.shimmer && weftP > 0.1) {
        for (let k = 0; k < 14; k++) {
          const sx = ((k * 137.5 + t * 12) % W + W) % W;
          const sy = H - (((k * 71.3 + t * 9) % (weftP * H) + weftP * H) % (weftP * H));
          ctx.globalAlpha = 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + k));
          ctx.fillStyle = "#fff3cf";
          ctx.fillRect(sx, sy, 1.4, 1.4);
        }
      }
      ctx.globalAlpha = 1;

      /* — scene 7: soft cinematic light as the camera lands — */
      if (doneP > 0) {
        // a slow golden sheen gliding across the silk
        const sx = ((t * 0.05) % 1.4 - 0.2) * (W + H);
        const sheen = ctx.createLinearGradient(sx - W * 0.2, 0, sx + W * 0.2, H * 0.5);
        sheen.addColorStop(0, "rgba(255,240,200,0)");
        sheen.addColorStop(0.5, `rgba(255,240,200,${0.07 * doneP})`);
        sheen.addColorStop(1, "rgba(255,240,200,0)");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, W, H);
        // warm corner reflections + a gentle vignette
        const glow = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.2, W * 0.5, H * 0.5, H * 0.9);
        glow.addColorStop(0, "rgba(230,198,122,0)");
        glow.addColorStop(1, `rgba(5,5,10,${0.32 * doneP})`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [cityKey, image]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
