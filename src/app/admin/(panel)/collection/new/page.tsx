import { PageHeader } from "@/components/admin/ui";
import ArtworkForm from "@/components/admin/ArtworkForm";
import { getCategoryNames, getCityNames } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function NewArtworkPage() {
  const [cities, categories] = await Promise.all([
    getCityNames(),
    getCategoryNames(),
  ]);

  return (
    <div>
      <PageHeader title="Create work" subtitle="Add a new piece to the collection" />
      <ArtworkForm cities={cities} categories={categories} />
    </div>
  );
}
