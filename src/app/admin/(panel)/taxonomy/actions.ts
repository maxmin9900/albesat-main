"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/taxonomy-defaults";
import { getCategories, getCities } from "@/lib/taxonomy";

// `name` comes back on a create so the quick-add on the work form can drop
// the new entry straight into its picker without a page reload.
export type TaxonomyResult = { ok: boolean; error?: string; name?: string };

const ok: TaxonomyResult = { ok: true };
const fail = (error: string): TaxonomyResult => ({ ok: false, error });

// Server actions are their own entry points — the session check in the panel
// layout does not cover them — so every one of these starts here.
async function requireAdmin() {
  return (await getSession()) !== null;
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "Give it at least two characters")
  .max(60, "That name is too long");

/** Every page whose content is built from the city / category lists. */
function revalidateTaxonomy() {
  revalidatePath("/admin/taxonomy");
  revalidatePath("/admin/collection");
  revalidatePath("/collection");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export async function createCity(
  name: string,
  province: string
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const cityName = parsed.data;

  // getCities seeds the table on a fresh database before we look for clashes
  const existing = await getCities(false);
  const slug = slugify(cityName);
  if (!slug) return fail("That name cannot be turned into a web address.");
  if (existing.some((c) => c.name.toLowerCase() === cityName.toLowerCase()))
    return fail(`"${cityName}" is already on the list.`);
  if (existing.some((c) => c.slug === slug))
    return fail(`Another city already uses the web address "${slug}".`);

  await prisma.city.create({
    data: {
      name: cityName,
      slug,
      province: province.trim() || null,
      sortOrder: existing.length,
    },
  });

  revalidateTaxonomy();
  return { ok: true, name: cityName };
}

export async function updateCity(
  id: string,
  name: string,
  province: string
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const cityName = parsed.data;

  const current = await prisma.city.findUnique({ where: { id } });
  if (!current) return fail("That city no longer exists.");

  const clash = await prisma.city.findFirst({
    where: { id: { not: id }, name: { equals: cityName, mode: "insensitive" } },
  });
  if (clash) return fail(`"${cityName}" is already on the list.`);

  const slug = slugify(cityName);
  const slugClash = await prisma.city.findFirst({
    where: { id: { not: id }, slug },
  });
  if (slugClash)
    return fail(`Another city already uses the web address "${slug}".`);

  // Artwork.city stores the city *name*, so a rename has to carry the works
  // with it — otherwise every piece filed under the old name drops off the
  // public collection page. Both writes go in one transaction.
  await prisma.$transaction([
    prisma.city.update({
      where: { id },
      data: { name: cityName, slug, province: province.trim() || null },
    }),
    prisma.artwork.updateMany({
      where: { city: current.name },
      data: { city: cityName },
    }),
  ]);

  revalidateTaxonomy();
  return ok;
}

export async function setCityActive(
  id: string,
  active: boolean
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");
  await prisma.city.update({ where: { id }, data: { active } });
  revalidateTaxonomy();
  return ok;
}

export async function deleteCity(id: string): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) return ok;

  const used = await prisma.artwork.count({ where: { city: city.name } });
  if (used > 0)
    return fail(
      `${used} work(s) are filed under ${city.name}. Hide it instead of ` +
        "deleting it, or move those works to another city first."
    );

  await prisma.city.delete({ where: { id } });
  revalidateTaxonomy();
  return ok;
}

export async function moveCity(
  id: string,
  direction: "up" | "down"
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");
  await reorder("city", id, direction);
  revalidateTaxonomy();
  return ok;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(name: string): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const catName = parsed.data;

  const existing = await getCategories(false);
  if (existing.some((c) => c.name.toLowerCase() === catName.toLowerCase()))
    return fail(`"${catName}" is already on the list.`);

  await prisma.category.create({
    data: { name: catName, sortOrder: existing.length },
  });

  revalidateTaxonomy();
  return { ok: true, name: catName };
}

export async function updateCategory(
  id: string,
  name: string
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const catName = parsed.data;

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return fail("That category no longer exists.");

  const clash = await prisma.category.findFirst({
    where: { id: { not: id }, name: { equals: catName, mode: "insensitive" } },
  });
  if (clash) return fail(`"${catName}" is already on the list.`);

  // same reasoning as a city rename — Artwork.category holds the name
  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { name: catName } }),
    prisma.artwork.updateMany({
      where: { category: current.name },
      data: { category: catName },
    }),
  ]);

  revalidateTaxonomy();
  return ok;
}

export async function setCategoryActive(
  id: string,
  active: boolean
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");
  await prisma.category.update({ where: { id }, data: { active } });
  revalidateTaxonomy();
  return ok;
}

export async function deleteCategory(id: string): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return ok;

  const used = await prisma.artwork.count({ where: { category: cat.name } });
  if (used > 0)
    return fail(
      `${used} work(s) use the ${cat.name} style. Hide it instead of ` +
        "deleting it, or move those works to another style first."
    );

  await prisma.category.delete({ where: { id } });
  revalidateTaxonomy();
  return ok;
}

export async function moveCategory(
  id: string,
  direction: "up" | "down"
): Promise<TaxonomyResult> {
  if (!(await requireAdmin())) return fail("Your session has expired.");
  await reorder("category", id, direction);
  revalidateTaxonomy();
  return ok;
}

// ---------------------------------------------------------------------------

/**
 * Swap a row with its neighbour in the display order.
 *
 * Rows seeded before this feature can share a sortOrder, so the whole list is
 * renumbered from its current order first — after that a swap is unambiguous.
 */
async function reorder(
  kind: "city" | "category",
  id: string,
  direction: "up" | "down"
) {
  const rows =
    kind === "city"
      ? await prisma.city.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true },
        })
      : await prisma.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true },
        });

  const from = rows.findIndex((r) => r.id === id);
  if (from < 0) return;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= rows.length) return;

  const ordered = [...rows];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];

  await prisma.$transaction(
    ordered.map((r, i) =>
      kind === "city"
        ? prisma.city.update({ where: { id: r.id }, data: { sortOrder: i } })
        : prisma.category.update({ where: { id: r.id }, data: { sortOrder: i } })
    )
  );
}
