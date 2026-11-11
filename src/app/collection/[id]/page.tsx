import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDimensions } from "@/lib/utils";
import { getUserSession } from "@/lib/user-auth";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import ArtworkDetail, {
  type DetailArtwork,
  type DetailViewer,
  type RelatedItem,
} from "@/components/landing/ArtworkDetail";

export const dynamic = "force-dynamic";

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      dossier: true,
    },
  });

  if (!artwork || artwork.status === "DRAFT" || artwork.status === "ARCHIVED") {
    notFound();
  }

  // fire-and-forget view counter
  prisma.artwork
    .update({ where: { id }, data: { viewsCount: { increment: 1 } } })
    .catch(() => {});

  // the first item in the admin's list wins — that is what the panel labels
  // "FIRST IMAGE" and what the collection page shows
  const image =
    artwork.images[0]?.url ??
    `/carpets/${artwork.city.toLowerCase()}-1.jpg`;

  const detail: DetailArtwork = {
    id: artwork.id,
    code: artwork.code,
    title: artwork.title,
    city: artwork.city,
    category: artwork.category,
    price: artwork.price.toString(),
    currency: artwork.currency,
    dimensions:
      formatDimensions(artwork.lengthCm, artwork.widthCm) ?? artwork.dimensions,
    pileMaterial: artwork.pileMaterial,
    approxAge: artwork.approxAge,
    description: artwork.description,
    status: artwork.status,
    image,
    media: artwork.images.map((img) => ({ id: img.id, url: img.url })),
    dossier: artwork.dossier
      ? {
          origin: artwork.dossier.origin,
          authentication: artwork.dossier.authentication,
          craftStory: artwork.dossier.craftStory,
          artisan: artwork.dossier.artisan,
          collection: artwork.dossier.collection,
        }
      : null,
  };

  // three more masterpieces from the same city
  const relatedRaw = await prisma.artwork.findMany({
    where: {
      city: artwork.city,
      id: { not: artwork.id },
      status: { in: ["PUBLISHED", "SOLD"] },
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 3,
  });
  const related: RelatedItem[] = relatedRaw.map((r) => ({
    id: r.id,
    title: r.title,
    city: r.city,
    price: r.price.toString(),
    currency: r.currency,
    image:
      r.images[0]?.url ?? `/carpets/${r.city.toLowerCase()}-1.jpg`,
  }));

  // signed-in member (prefills the acquisition form)
  const session = await getUserSession();
  let viewer: DetailViewer = null;
  if (session) {
    const u = await prisma.user.findUnique({ where: { id: session.uid } });
    if (u) viewer = { name: u.fullName, address: u.address };
  }

  return (
    <main className="min-h-screen bg-void">
      <LandingNav />
      <ArtworkDetail artwork={detail} related={related} viewer={viewer} />
      <SiteFooter />
    </main>
  );
}
