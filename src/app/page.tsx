import { prisma } from "@/lib/prisma";
import SmoothScroll from "@/components/landing/SmoothScroll";
import LandingNav from "@/components/landing/LandingNav";
import CosmicHero from "@/components/landing/CosmicHero";
import IranMap, { type CityImages } from "@/components/landing/IranMap";
import CollectionShowcase, {
  type ShowcaseItem,
} from "@/components/landing/CollectionShowcase";
import Footer from "@/components/landing/Footer";
import { LANDING_CARPETS } from "@/lib/landing-carpets";

// the carpet cities shown on the illustrated map — must match CITIES in
// IranMap.tsx and REGIONS in the collection archive
const MAP_CITY_KEYS = [
  "tabriz",
  "turkaman",
  "tehran",
  "mashhad",
  "qom",
  "kashan",
  "nain",
  "esfahan",
  "kerman",
  "baluch",
  "shiraz",
] as const;

export const dynamic = "force-dynamic";

async function getFeatured(): Promise<ShowcaseItem[]> {
  try {
    const artworks = await prisma.artwork.findMany({
      where: { status: { in: ["PUBLISHED", "SOLD"] } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    // one representative masterpiece per map city, in map order
    const featured: ShowcaseItem[] = [];
    for (const key of MAP_CITY_KEYS) {
      const a = artworks.find((x) => x.city.toLowerCase() === key);
      if (!a) continue;
      featured.push({
        id: a.id,
        title: a.title,
        city: a.city,
        code: a.code,
        price: a.price.toString(),
        currency: a.currency,
        image: a.images[0]?.url ?? `/carpets/${key}-1.jpg`,
      });
    }
    return featured;
  } catch {
    return [];
  }
}

export default async function Home() {
  const featured = await getFeatured();

  // The carpet each city weaves on the loom. The client's chosen photograph
  // wins; a city without one falls back to its featured piece, then to the
  // older art.
  const cityImages: CityImages = {};
  for (const key of MAP_CITY_KEYS) {
    const match = featured.find((f) => f.city.toLowerCase() === key);
    cityImages[key] =
      LANDING_CARPETS[key] ?? match?.image ?? `/carpets/${key}-1.jpg`;
  }

  return (
    <SmoothScroll>
      <main className="relative bg-void">
        <LandingNav />
        <CosmicHero />
        <IranMap images={cityImages} />
        <CollectionShowcase items={featured} />
        <Footer />
      </main>
    </SmoothScroll>
  );
}
