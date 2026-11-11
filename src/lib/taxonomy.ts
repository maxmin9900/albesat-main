import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CITIES,
  slugify,
} from "@/lib/taxonomy-defaults";

export type CityOption = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  sortOrder: number;
  active: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

/**
 * Put the shipped lists into the tables the first time they are read empty.
 *
 * This is what lets the upgrade land with nothing but `prisma db push` — the
 * production entrypoint already runs that on boot — while a database that has
 * been curated in the panel is never touched again. `skipDuplicates` keeps two
 * requests racing on a cold start from failing on the unique names.
 */
async function seedIfEmpty() {
  const [cities, categories] = await Promise.all([
    prisma.city.count(),
    prisma.category.count(),
  ]);

  if (cities === 0) {
    await prisma.city.createMany({
      data: DEFAULT_CITIES.map((c, i) => ({ ...c, sortOrder: i })),
      skipDuplicates: true,
    });
  }
  if (categories === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name, i) => ({ name, sortOrder: i })),
      skipDuplicates: true,
    });
  }
}

/** Every city, newest sort order first. Pass `false` to include retired ones. */
export async function getCities(activeOnly = true): Promise<CityOption[]> {
  await seedIfEmpty();
  return prisma.city.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getCategories(
  activeOnly = true
): Promise<CategoryOption[]> {
  await seedIfEmpty();
  return prisma.category.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getCityNames(activeOnly = true) {
  return (await getCities(activeOnly)).map((c) => c.name);
}

export async function getCategoryNames(activeOnly = true) {
  return (await getCategories(activeOnly)).map((c) => c.name);
}

/**
 * Resolve the `?city=` key on the public collection page. Matches the slug
 * first, then the plain name, so links written before slugs existed
 * (`?city=esfahan`, and anything a visitor has bookmarked) still land.
 * Retired cities resolve too — a link to one should show its works, not 404.
 */
export async function findCity(key: string | undefined) {
  if (!key) return null;
  const wanted = key.trim().toLowerCase();
  if (!wanted) return null;
  const all = await getCities(false);
  return (
    all.find((c) => c.slug.toLowerCase() === wanted) ??
    all.find((c) => c.name.toLowerCase() === wanted) ??
    all.find((c) => slugify(c.name) === wanted) ??
    null
  );
}
