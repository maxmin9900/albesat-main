import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge, EmptyState } from "@/components/admin/ui";
import ArtworkActions from "@/components/admin/ArtworkActions";
import CollectionFilters from "@/components/admin/CollectionFilters";
import { ARTWORK_STATUS } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";
import { getCategoryNames, getCityNames } from "@/lib/taxonomy";
import { Eye, Heart } from "lucide-react";
import { Zoomable } from "@/components/ui/Lightbox";
import type { Prisma, ArtworkStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(ARTWORK_STATUS);

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    city?: string;
    category?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const city = (sp.city ?? "").trim();
  const category = (sp.category ?? "").trim();

  /**
   * One box across everything that identifies a piece, plus a dropdown for
   * each of the three columns worth narrowing by.
   *
   * The free-text fields are the ones an admin actually has in hand when
   * hunting for a work: what it is called, the code off the label, where it
   * came from, its style, what it is made of, how old it is, its size, and
   * the description. `contains` + insensitive so a partial code ("TAB-04")
   * and a lowercase city both land.
   */
  const where: Prisma.ArtworkWhereInput = {};
  if (status) where.status = status as ArtworkStatus;
  if (city) where.city = city;
  if (category) where.category = category;
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [
      { title: like },
      { code: like },
      { city: like },
      { category: like },
      { pileMaterial: like },
      { approxAge: like },
      { dimensions: like },
      { description: like },
    ];
  }

  const filtering = Boolean(q || status || city || category);

  const [artworks, totalCount, cities, categories] = await Promise.all([
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        // first by sort order, not "the MAIN one" — a piece uploaded entirely
        // as Gallery has no MAIN image and would show an empty thumbnail. All
        // of them, so the thumbnail can open the whole set in the viewer.
        images: { orderBy: { sortOrder: "asc" } },
        // drives the gavel toggle in the row actions: the open session this
        // carpet is a lot in, if any
        lots: {
          where: {
            auction: {
              status: { in: ["DRAFT", "SCHEDULED", "REGISTRATION_OPEN", "LIVE"] },
            },
          },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            auction: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    }),
    prisma.artwork.count(),
    getCityNames(),
    getCategoryNames(),
  ]);

  return (
    <div>
      <PageHeader
        title="Collection"
        subtitle={
          filtering
            ? `${artworks.length} of ${totalCount} works`
            : `${totalCount} works`
        }
        action={{ href: "/admin/collection/new", label: "+ Create work" }}
      />

      <CollectionFilters cities={cities} categories={categories} />

      {artworks.length === 0 ? (
        <EmptyState
          text={
            filtering
              ? "No works match these filters."
              : "No works yet. Create your first piece."
          }
        />
      ) : (
        <Table
          head={[
            "Image",
            "Code / Title",
            "City",
            "Category",
            "Price",
            "Stats",
            "Auction session",
            "Status",
            "Actions",
          ]}
        >
          {artworks.map((a) => {
            const st = ARTWORK_STATUS[a.status];
            const img = a.images[0]?.url;
            // "on auction" means visible to the public, not merely existing
            const session = a.lots[0]?.auction ?? null;
            const live =
              session?.status === "REGISTRATION_OPEN" ||
              session?.status === "LIVE" ||
              session?.status === "SCHEDULED";
            return (
              <tr key={a.id} className="hover:bg-space/50">
                <td className="px-4 py-3">
                  <Zoomable
                    items={a.images.map((im) => ({ url: im.url, alt: a.title }))}
                    caption={a.title}
                    className="h-12 w-12 overflow-hidden rounded-md"
                  >
                    <div
                      className="h-12 w-12 rounded-md border border-gold/10 bg-contain bg-center bg-no-repeat"
                      style={{
                        backgroundImage: img ? `url(${img})` : undefined,
                        background: img ? undefined : "var(--color-space)",
                      }}
                    />
                  </Zoomable>
                </td>
                <td className="px-4 py-3">
                  <p className="text-silk">{a.title}</p>
                  <p className="text-xs text-muted">{a.code}</p>
                </td>
                <td className="px-4 py-3 text-cream/80">{a.city}</td>
                <td className="px-4 py-3 text-cream/70">{a.category}</td>
                <td className="px-4 py-3 text-gold">
                  {formatCurrency(Number(a.price), a.currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {a.viewsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {a.favoritesCount}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {live && session ? (
                    <Link
                      href={`/admin/auctions/${session.id}`}
                      className="text-xs text-gold hover:underline"
                    >
                      {session.title}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <ArtworkActions
                    id={a.id}
                    status={a.status}
                    onAuction={live}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
