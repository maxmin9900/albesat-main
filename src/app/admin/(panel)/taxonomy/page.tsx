import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import TaxonomyManager, {
  type CategoryRow,
  type CityRow,
} from "@/components/admin/TaxonomyManager";
import { getCategories, getCities } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  // include retired entries — this is the page where they are brought back
  const [cities, categories] = await Promise.all([
    getCities(false),
    getCategories(false),
  ]);

  // how many works are filed under each, so the page can warn before a delete
  const [byCity, byCategory] = await Promise.all([
    prisma.artwork.groupBy({ by: ["city"], _count: { _all: true } }),
    prisma.artwork.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);

  const cityCounts = new Map(byCity.map((r) => [r.city, r._count._all]));
  const categoryCounts = new Map(
    byCategory.map((r) => [r.category, r._count._all])
  );

  const cityRows: CityRow[] = cities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    province: c.province,
    active: c.active,
    works: cityCounts.get(c.name) ?? 0,
  }));

  const categoryRows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    active: c.active,
    works: categoryCounts.get(c.name) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Cities & categories"
        subtitle="The lists behind the city and category pickers on a work"
      />
      <TaxonomyManager cities={cityRows} categories={categoryRows} />

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted">
        Hiding an entry keeps it off the pickers without touching the works
        already filed under it. Renaming one moves those works with it. The
        hand-drawn map on the home page shows a fixed set of cities, so a city
        added here is reachable from the collection page and its own link, but
        does not appear on the map.
      </p>
    </div>
  );
}
