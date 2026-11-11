import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import ArtworkForm, { type ArtworkFormData } from "@/components/admin/ArtworkForm";
import { getCategoryNames, getCityNames } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function EditArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cities, categories] = await Promise.all([
    getCityNames(),
    getCategoryNames(),
  ]);
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      dossier: true,
    },
  });

  if (!artwork) notFound();

  const data: ArtworkFormData = {
    id: artwork.id,
    code: artwork.code,
    title: artwork.title,
    city: artwork.city,
    category: artwork.category,
    price: artwork.price.toString(),
    currency: artwork.currency,
    intrinsicValue: artwork.intrinsicValue?.toString() ?? "",
    intrinsicValueSource: artwork.intrinsicValueSource ?? undefined,
    lengthCm: artwork.lengthCm?.toString() ?? "",
    widthCm: artwork.widthCm?.toString() ?? "",
    pileMaterial: artwork.pileMaterial ?? "",
    approxAge: artwork.approxAge ?? "",
    description: artwork.description ?? "",
    status: artwork.status,
    images: artwork.images.map((i) => ({ url: i.url, type: i.type })),
    dossier: artwork.dossier
      ? {
          origin: artwork.dossier.origin,
          dimensions: artwork.dossier.dimensions,
          material: artwork.dossier.material,
          foundation: artwork.dossier.foundation,
          age: artwork.dossier.age,
          authentication: artwork.dossier.authentication,
          craftstory: artwork.dossier.craftStory,
          artisan: artwork.dossier.artisan,
          collection: artwork.dossier.collection,
        }
      : {},
  };

  return (
    <div>
      <PageHeader
        title="Edit work"
        subtitle={`${artwork.title} — ${artwork.code}`}
      />
      <ArtworkForm data={data} cities={cities} categories={categories} />
    </div>
  );
}
