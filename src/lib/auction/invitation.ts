/**
 * The printed details of one sale — shared by the banner above the
 * registration form and the confirmation the visitor gets afterwards, so the
 * two can never drift apart.
 */
export type Invitation = {
  title: string;
  /** ISO — the moment the sale opens */
  startAt: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueHall: string | null;
  intro: string | null;
  viewingFrom: string | null;
  viewingTo: string | null;
};

/**
 * The sale is physically in Muscat, so its date and time are printed in
 * Muscat time for everyone. Formatting in the reader's own zone would tell a
 * visitor in Tehran to arrive at the wrong hour.
 */
const MUSCAT = "Asia/Muscat";

/**
 * "Wednesday, 21 October 2026".
 *
 * en-GB prints the weekday without a comma, so it is added back to match the
 * wording the client approved.
 */
export function sessionDateLong(iso: string | null) {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MUSCAT,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

/** "21 October 2026" — for the compact picker label */
export function sessionDateShort(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: MUSCAT,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * "7:00 PM" in Muscat.
 *
 * Oman reads the clock in twelve hours, so a printed "19:00" looks foreign
 * on an invitation to a Muscat sale.
 */
export function sessionTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso)
    .toLocaleTimeString("en-US", {
      timeZone: MUSCAT,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/ /g, " "); // some ICU builds use a narrow space before AM/PM
}

/**
 * "5:00 PM" from a "17:00" the admin typed.
 *
 * The viewing times are free text on the session rather than instants, so
 * they are converted by reading the wall-clock directly. Anything that is
 * not an HH:MM is passed through untouched — the admin may have written
 * "by appointment".
 */
export function to12Hour(value: string | null) {
  if (!value) return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  const min = m[2];
  if (h > 23 || Number(min) > 59) return value;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}

/** "5:00 PM – 7:00 PM", or nothing when no viewing window was recorded */
export function viewingWindow(from: string | null, to: string | null) {
  const a = to12Hour(from);
  const b = to12Hour(to);
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
}

/**
 * Turn what the admin typed into the instant it actually names.
 *
 * A `datetime-local` value carries no zone ("2026-10-21T19:00"), so
 * `new Date()` reads it in whatever zone the machine is on — the admin's in
 * the browser, the container's on the server. Neither is Muscat, and the two
 * disagree, so the preview and the saved row drift apart.
 *
 * Every sale happens in Muscat, so the entered wall-clock IS Muscat time.
 * Oman keeps UTC+04:00 all year with no daylight saving, so pinning the
 * offset is exact rather than an approximation.
 */
export function muscatLocalToUtc(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim()
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, sec] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${sec ?? "00"}+04:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
