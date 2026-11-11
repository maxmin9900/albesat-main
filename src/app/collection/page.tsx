import { prisma } from "@/lib/prisma";
import SmoothScroll from "@/components/landing/SmoothScroll";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import CollectionArchive, {
  type ArchiveWork,
} from "@/components/landing/CollectionArchive";
import { findCity, getCategoryNames, getCities } from "@/lib/taxonomy";
import { LANDING_CARPETS } from "@/lib/landing-carpets";

export const dynamic = "force-dynamic";

/**
 * The archive is the home page's loom and gallery, on their own page.
 *
 * Arriving from a city on the map (`?city=esfahan`) weaves that city's carpet
 * and opens the gallery already filtered to it. Arriving from the Collection
 * tab weaves the first carpet in the archive and shows everything. Either way
 * the whole catalogue is sent down, so the search and the filters below the
 * loom work without another round trip.
 */
export default async function CollectionArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;

  const [region, cityList, categories] = await Promise.all([
    findCity(city),
    getCities(),
    getCategoryNames(),
  ]);

  const artworks = await prisma.artwork.findMany({
    where: { status: { in: ["PUBLISHED", "SOLD"] } },
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  // slug per city name, so a card knows the key the loom and the map use
  const slugOf = new Map(cityList.map((c) => [c.name, c.slug]));

  const works: ArchiveWork[] = artworks.map((a) => ({
    id: a.id,
    title: a.title,
    city: a.city,
    citySlug: slugOf.get(a.city) ?? a.city.toLowerCase(),
    code: a.code,
    category: a.category,
    material: a.pileMaterial ?? "",
    price: a.price.toString(),
    currency: a.currency,
    image: a.images[0]?.url ?? `/carpets/${a.city.toLowerCase()}-1.jpg`,
    sold: a.status === "SOLD",
  }));

  // Pile material is a free-text field on the work, not a managed list, so the
  // filter's options are the distinct values actually in the archive.
  const materials = [...new Set(works.map((w) => w.material).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  // what goes on the loom: the chosen city's first carpet, else the archive's
  const forWeave = region
    ? works.filter((w) => w.city === region.name)
    : works;
  const weaveCity = region?.slug ?? forWeave[0]?.citySlug ?? "kashan";
  // the same loom as the home page, so the same carpet per city
  const weaveImage =
    LANDING_CARPETS[weaveCity] ??
    forWeave[0]?.image ??
    `/carpets/${weaveCity}-1.jpg`;

  return (
    <SmoothScroll>
      <main className="min-h-screen bg-void">
        <LandingNav />
        <CollectionArchive
          works={works}
          cities={cityList.map((c) => c.name)}
          categories={categories}
          materials={materials}
          weaveCity={weaveCity}
          weaveImage={weaveImage}
          initialCity={region?.name ?? ""}
        />
        <SiteFooter />
      </main>
    </SmoothScroll>
  );
}
