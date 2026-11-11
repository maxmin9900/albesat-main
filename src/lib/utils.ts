import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOL: Record<string, string> = {
  OMR: "OMR ",
  IRR: "﷼",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
};

export function formatCurrency(
  amount: number | string,
  currency: string = "OMR"
) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${symbol}${formatted}`;
}

/**
 * The house runs on Muscat time.
 *
 * Without an explicit zone this renders in whatever zone the machine is on —
 * UTC inside the production container for anything server-rendered, and the
 * reader's own zone in the browser. Both are wrong: a sale, a viewing and a
 * payment deadline all happen in Muscat, so that is what is printed.
 */
export const HOUSE_TZ = "Asia/Muscat";

export function formatDate(date: Date | string, locale: string = "en-US") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: HOUSE_TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Carpets are measured in cm here but quoted in feet across the Gulf market,
// so every dimension is shown both ways.
export function cmToFeetInches(cm: number) {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return `${feet}′${inches}″`;
}

const trimNum = (n: number) =>
  Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));

/** "300 × 200 cm · 9′10″ × 6′7″" — null when either side is missing. */
export function formatDimensions(
  lengthCm: number | null | undefined,
  widthCm: number | null | undefined
) {
  if (!lengthCm || !widthCm) return null;
  return (
    `${trimNum(lengthCm)} × ${trimNum(widthCm)} cm · ` +
    `${cmToFeetInches(lengthCm)} × ${cmToFeetInches(widthCm)}`
  );
}

// Media stored on an artwork can be a photo or a clip; the record only keeps a
// URL, so the extension is what tells the two apart at render time.
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|avi|mpeg|mpg|ogv)(\?.*)?$/i;

export function isVideoUrl(url: string | null | undefined) {
  return !!url && VIDEO_EXT.test(url);
}

// Generate an artwork code like CS-TBZ-1A2B3C
export function generateArtworkCode(city?: string) {
  const cityCode = (city ?? "SAM")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CS-${cityCode}-${rand}`;
}

export function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ORD-${ts}-${rand}`;
}
