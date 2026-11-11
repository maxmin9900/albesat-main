// The lists the archive shipped with, before cities and categories became
// editable in the admin panel (see /admin/taxonomy).
//
// They are no longer the source of truth — the City and Category tables are.
// They survive only as the seed applied the first time those tables are read
// on an empty database, so an existing deployment keeps exactly the cities and
// categories it had before the upgrade.

export type CitySeed = { name: string; slug: string; province: string };

// in atlas order — the same order the hand-drawn map in
// src/components/landing/IranMap.tsx walks its cities in
export const DEFAULT_CITIES: CitySeed[] = [
  { name: "Tabriz", slug: "tabriz", province: "East Azerbaijan" },
  { name: "Tehran", slug: "tehran", province: "Tehran Province" },
  { name: "Qom", slug: "qom", province: "Qom Province" },
  { name: "Kashan", slug: "kashan", province: "Isfahan Province" },
  { name: "Nain", slug: "nain", province: "Isfahan Province" },
  { name: "Esfahan", slug: "esfahan", province: "Isfahan Province" },
  { name: "Turkaman", slug: "turkaman", province: "Golestan Province" },
  { name: "Mashhad", slug: "mashhad", province: "Razavi Khorasan" },
  { name: "Kerman", slug: "kerman", province: "Kerman Province" },
  { name: "Baluch", slug: "baluch", province: "Sistan & Baluchestan" },
  { name: "Shiraz", slug: "shiraz", province: "Fars Province" },
];

export const DEFAULT_CATEGORIES = [
  "Medallion",
  "Floral",
  "Shah Abbasi",
  "Geometric",
  "Silk Floral",
  "Pictorial",
  "Tribal",
];

/**
 * URL key for a city name: "Shah Abbasi" -> "shah-abbasi".
 *
 * A name written in a non-latin script (Persian, say) has nothing left after
 * the ASCII filter, so it falls back to the percent-encoded name rather than
 * to an empty slug that would collide with every other such city.
 */
export function slugify(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || encodeURIComponent(name.trim().toLowerCase());
}
