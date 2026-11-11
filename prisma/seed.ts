import { PrismaClient, ImageType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function code(city: string) {
  const c = city.slice(0, 3).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CS-${c}-${r}`;
}

// Local carpet images downloaded from Wikimedia (public/carpets/*)
// Each of the six map cities has three works: {city}-1.jpg … {city}-3.jpg
const IMG = (city: string, n: number) => `/carpets/${city.toLowerCase()}-${n}.jpg`;

async function main() {
  console.log("🌱 Seeding ALBESAT ...");

  // --- Admin ---
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@carpetsamir.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Admin ready → ${adminEmail} / ${adminPassword}`);

  // No mock users, orders or bids are seeded — real customers register on
  // the site (/register) and their activity flows into the admin panel.

  // --- Artworks: three works for each of the six map cities -----------------
  type Piece = {
    title: string;
    category: string;
    price: string;
    dimensions: string;
    pile: string;
    foundation: string;
    density: string;
    age: string;
    condition: string;
    status: "PUBLISHED" | "SOLD";
    story: string;
    artisan: string;
  };

  const CITY_PIECES: Record<string, Piece[]> = {
    Tabriz: [
      { title: "Tabriz Lacquer Masterpiece", category: "Medallion", price: "18500", dimensions: "300 × 200 cm", pile: "Hand-spun kork wool", foundation: "Silk & cotton", density: "70 raj", age: "Contemporary (2021)", condition: "New / flawless", status: "PUBLISHED", story: "In the atelier of Master Rahimzadeh of Tabriz, each knot of this seven-colour lacquer design was tied with quiet devotion.", artisan: "Master Rahimzadeh" },
      { title: "Antique Tabriz Haj-Jalili", category: "Antique Medallion", price: "27700", dimensions: "340 × 240 cm", pile: "Fine highland wool", foundation: "Cotton", density: "60 raj", age: "circa 1900 (collectible)", condition: "Authentic antique", status: "PUBLISHED", story: "A copper-toned Haj-Jalili court weaving — the calm geometry that made Tabriz famous across empires.", artisan: "Haj-Jalili workshop tradition" },
      { title: "Tabriz Four-Season Panel", category: "Pictorial", price: "15000", dimensions: "280 × 190 cm", pile: "Kork wool & silk inlay", foundation: "Cotton", density: "65 raj", age: "20 years", condition: "Excellent", status: "PUBLISHED", story: "Four gardens in one field — spring to winter woven side by side, as Tabriz masters love to boast.", artisan: "Alabaf of Tabriz" },
    ],
    Qom: [
      { title: "Qom Pure Silk", category: "Silk Floral", price: "20800", dimensions: "200 × 140 cm", pile: "Pure silk", foundation: "Silk", density: "100 raj", age: "Contemporary", condition: "New", status: "SOLD", story: "The shimmer of Qom silk, changing colour as the light shifts across it.", artisan: "Moayeri Workshop" },
      { title: "Qom Four Seasons Silk", category: "Silk Pictorial", price: "23500", dimensions: "210 × 140 cm", pile: "Pure silk", foundation: "Silk", density: "110 raj", age: "Contemporary", condition: "New", status: "PUBLISHED", story: "A year of Persian light held in silk — the four-season garden of the Qom looms.", artisan: "Jamshidi Atelier" },
      { title: "Qom Tree of Life", category: "Silk Tableau", price: "17300", dimensions: "150 × 100 cm", pile: "Pure silk", foundation: "Silk", density: "105 raj", age: "10 years", condition: "Excellent", status: "PUBLISHED", story: "The Tree of Life rises knot by knot, its branches carrying birds of paradise in twelve shades of silk.", artisan: "Master Ahmadi" },
    ],
    Kashan: [
      { title: "Kashan Floral Garden", category: "Floral", price: "8500", dimensions: "250 × 150 cm", pile: "Merino wool", foundation: "Cotton", density: "50 raj", age: "30 years", condition: "Excellent", status: "PUBLISHED", story: "This is Kashan — where the hands of Lila tie each knot to the whisper of an ancient poem.", artisan: "Lila's workshop" },
      { title: "Mohtasham Kashan Pictorial", category: "Antique Pictorial", price: "32700", dimensions: "310 × 210 cm", pile: "Kork wool", foundation: "Cotton", density: "55 raj", age: "circa 1890 (museum-grade)", condition: "Authentic antique", status: "PUBLISHED", story: "A Mohtasham court piece — the velvet-dark reds that made Kashan the poet of Persian weaving.", artisan: "Mohtasham tradition" },
      { title: "Kashan Prayer Niche", category: "Prayer (Mihrab)", price: "10800", dimensions: "200 × 130 cm", pile: "Wool & silk", foundation: "Cotton", density: "52 raj", age: "40 years", condition: "Very good", status: "PUBLISHED", story: "A mihrab of flowers — the prayer rugs of Kashan turn devotion into a garden.", artisan: "Sadeghi family" },
    ],
    Shiraz: [
      { title: "Qashqai Tribal Medallion", category: "Tribal", price: "5400", dimensions: "260 × 170 cm", pile: "Hand-spun tribal wool", foundation: "Wool", density: "30 raj", age: "50 years", condition: "Authentic tribal", status: "PUBLISHED", story: "Woven in the black tents of Fars — the Qashqai medallion carries the road-songs of migration.", artisan: "Qashqai weavers" },
      { title: "Shiraz Gabbeh of the Plains", category: "Gabbeh", price: "3650", dimensions: "240 × 160 cm", pile: "Thick highland wool", foundation: "Wool", density: "Coarse gabbeh weave", age: "Contemporary", condition: "New", status: "PUBLISHED", story: "A single tree on an endless field — the gabbeh's silence says what Hafez said in verse.", artisan: "Nomad cooperative of Fars" },
      { title: "Khamseh Bird Rug", category: "Tribal Pictorial", price: "6750", dimensions: "250 × 160 cm", pile: "Tribal wool", foundation: "Wool & cotton", density: "32 raj", age: "60 years", condition: "Collectible", status: "PUBLISHED", story: "A thousand little birds — the Khamseh confederation's favourite riddle, woven near Shiraz.", artisan: "Khamseh weavers" },
    ],
    Mashhad: [
      { title: "Mashhad Khorasan Grand Carpet", category: "Medallion", price: "16200", dimensions: "400 × 300 cm", pile: "Khorasan wool", foundation: "Cotton", density: "45 raj", age: "35 years", condition: "Excellent", status: "PUBLISHED", story: "Under the golden dome, the grand looms of Mashhad weave fields wide enough for a caravan to rest on.", artisan: "Saber workshop" },
      { title: "Antique Khorasan Fragment", category: "Antique", price: "22300", dimensions: "260 × 180 cm", pile: "Kork wool", foundation: "Cotton", density: "48 raj", age: "18th century fragment", condition: "Museum fragment, conserved", status: "PUBLISHED", story: "A surviving voice of Safavid Khorasan — herati leaves still breathing after three centuries.", artisan: "Safavid-era looms" },
      { title: "Portuguese Design Carpet", category: "Safavid Revival", price: "25400", dimensions: "330 × 230 cm", pile: "Wool & silk", foundation: "Cotton", density: "50 raj", age: "Revival, 60 years", condition: "Very good", status: "PUBLISHED", story: "Ships and strangers on a Persian sea — Khorasan's famous 'Portuguese' design, retold in Mashhad.", artisan: "Amoghli tradition" },
    ],
    Sistan: [
      { title: "Baluch Prayer Rug", category: "Baluch", price: "2600", dimensions: "150 × 90 cm", pile: "Camel & sheep wool", foundation: "Wool", density: "Fine Baluch weave", age: "70 years", condition: "Authentic tribal", status: "PUBLISHED", story: "Madder red and camel brown — the Baluch prayer rugs of Sistan fold the desert into a doorway.", artisan: "Baluch weavers of Sistan" },
      { title: "Sistan Baluch Tree Rug", category: "Baluch Pictorial", price: "3400", dimensions: "180 × 100 cm", pile: "Tribal wool", foundation: "Wool", density: "Fine Baluch weave", age: "circa 1950", condition: "Collectible", status: "PUBLISHED", story: "Aylin's grandmothers wove this tree — every branch a route across the endless east.", artisan: "Sistan village looms" },
      { title: "Antique Baluch Sofreh", category: "Baluch Flatweave", price: "2100", dimensions: "140 × 90 cm", pile: "Wool flatweave", foundation: "Wool", density: "Sofreh weave", age: "mid-19th century", condition: "Authentic antique", status: "PUBLISHED", story: "A bread-cloth of the frontier — geometry sharp as the Sistan wind that raised it.", artisan: "Baluch nomads" },
    ],
  };

  // one-time migration: if the OMR catalogue isn't in place yet,
  // clear the old demo artworks (and everything referencing them) first.
  const hasNewCatalogue = await prisma.artwork.findFirst({
    where: { currency: "OMR" },
  });
  if (!hasNewCatalogue) {
    await prisma.auctionWinner.deleteMany();
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.artwork.deleteMany(); // images/dossiers/favorites cascade
    console.log("♻️  old demo artworks cleared");
  }

  const artworks = [];
  for (const [city, pieces] of Object.entries(CITY_PIECES)) {
    for (let i = 0; i < pieces.length; i++) {
      const a = pieces[i];
      const existing = await prisma.artwork.findFirst({
        where: { title: a.title },
      });
      if (existing) {
        artworks.push(existing);
        continue;
      }
      const src = IMG(city, i + 1);
      const art = await prisma.artwork.create({
        data: {
          code: code(city),
          title: a.title,
          city,
          category: a.category,
          price: a.price,
          currency: "OMR",
          dimensions: a.dimensions,
          pileMaterial: a.pile,
          foundationMaterial: a.foundation,
          knotDensity: a.density,
          approxAge: a.age,
          condition: a.condition,
          description: a.story,
          status: a.status,
          viewsCount: Math.floor(Math.random() * 4000) + 200,
          favoritesCount: Math.floor(Math.random() * 400) + 10,
          images: {
            create: [
              { url: src, type: ImageType.MAIN, sortOrder: 0, alt: a.title },
              { url: src, type: ImageType.WEAVE_CLOSEUP, sortOrder: 1 },
              { url: src, type: ImageType.BACK, sortOrder: 2 },
              { url: src, type: ImageType.KNOT_DETAIL, sortOrder: 3 },
            ],
          },
          dossier: {
            create: {
              origin: city,
              dimensions: a.dimensions,
              material: a.pile,
              foundation: a.foundation,
              age: a.age,
              condition: a.condition,
              authentication: "ALBESAT digital certificate",
              craftStory: a.story,
              artisan: a.artisan,
              collection: `${city} Collection`,
            },
          },
        },
      });
      artworks.push(art);
    }
  }
  console.log(`✅ ${artworks.length} artworks (3 per city × 6 cities)`);

  // --- Three live auctions (the Royal Auction hall) -----------------------
  const now = new Date();
  const auctionPicks = [
    { title: "Qom Four Seasons Silk", base: "7700", hours: 28 },
    { title: "Kashan Prayer Niche", base: "4200", hours: 52 },
    { title: "Tabriz Four-Season Panel", base: "6100", hours: 74 },
  ];
  for (let a = 0; a < auctionPicks.length; a++) {
    const pick = auctionPicks[a];
    const art = artworks.find((x) => x.title === pick.title);
    if (!art) continue;
    const existingAuction = await prisma.auction.findFirst({
      where: { artworkId: art.id },
    });
    if (existingAuction) continue;

    await prisma.auction.create({
      data: {
        title: `Royal Auction — ${art.title}`,
        artworkId: art.id,
        basePrice: pick.base,
        minBidIncrement: "100",
        currency: "OMR",
        startAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + pick.hours * 60 * 60 * 1000),
        status: "LIVE",
      },
    });
  }
  console.log("✅ 3 live auctions (no mock bids — real members bid on-site)");

  console.log("🌱 Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
