"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateArtworkCode, formatDimensions } from "@/lib/utils";
import { getCityNames } from "@/lib/taxonomy";
import { valuationService } from "@/lib/auction/valuation";
import { D } from "@/lib/auction/money";
import type { ArtworkStatus, Currency, ImageType } from "@prisma/client";

const imageSchema = z.object({
  // absolute URL or a site-relative path like /carpets/tabriz-1.jpg
  url: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("/") || /^https?:\/\//i.test(v), {
      message: "Must be a URL or a /path",
    }),
  type: z.enum(["MAIN", "GALLERY", "WEAVE_CLOSEUP", "BACK", "KNOT_DETAIL"]),
});

// an empty measurement box means "not recorded", not "zero"
const optionalCm = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().positive("Must be a positive number").optional()
);

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  // The city is checked against the archive's city list further down, once the
  // list has been read from the database — a city outside it would save fine
  // but never show on the public collection page.
  city: z.string().trim().min(1, "City is required"),
  category: z.string().trim().min(1, "Category is required"),
  price: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be a positive number"),
  currency: z.enum(["OMR", "IRR", "USD", "EUR", "AED"]),
  lengthCm: optionalCm,
  widthCm: optionalCm,
  intrinsicValue: optionalCm, // same "empty means not recorded" rule
  pileMaterial: z.string().optional(),
  approxAge: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PRIVATE", "PUBLISHED", "SOLD", "ARCHIVED"]),
  // dossier
  dossierOrigin: z.string().optional(),
  dossierDimensions: z.string().optional(),
  dossierMaterial: z.string().optional(),
  dossierFoundation: z.string().optional(),
  dossierAge: z.string().optional(),
  dossierAuthentication: z.string().optional(),
  dossierCraftStory: z.string().optional(),
  dossierArtisan: z.string().optional(),
  dossierCollection: z.string().optional(),
});

export type SaveState = { error?: string; fieldErrors?: Record<string, string> };

export async function saveArtwork(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const id = String(formData.get("id") ?? "");
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the form errors.", fieldErrors };
  }
  const d = parsed.data;

  // The cities are editable at /admin/taxonomy, so the allowed set is only
  // known at request time. A retired city is still accepted when the work is
  // already filed under it — editing a piece must never be blocked by a list
  // change made after it was created.
  const cityNames = await getCityNames(false);
  if (!cityNames.includes(d.city)) {
    return {
      error: "Please fix the form errors.",
      fieldErrors: {
        city: `Pick one of: ${(await getCityNames()).join(", ")}`,
      },
    };
  }

  // Images arrive as a JSON blob from the hidden field. If it cannot be read,
  // bail out — the update below replaces the whole image set, so treating an
  // unreadable list as "no images" silently deletes every photo on the piece.
  let images: { url: string; type: ImageType }[];
  try {
    const arr = JSON.parse(String(formData.get("images") ?? "[]"));
    images = z.array(imageSchema).parse(arr) as typeof images;
  } catch {
    return {
      error:
        "The image list could not be read, so nothing was saved. " +
        "Reload the page and try again.",
    };
  }

  const artworkData = {
    title: d.title,
    city: d.city,
    category: d.category,
    price: d.price,
    currency: d.currency as Currency,
    lengthCm: d.lengthCm ?? null,
    widthCm: d.widthCm ?? null,
    // keep the legacy text field in step so nothing that still reads it breaks
    dimensions: formatDimensions(d.lengthCm, d.widthCm),
    pileMaterial: d.pileMaterial || null,
    approxAge: d.approxAge || null,
    description: d.description || null,
    status: d.status as ArtworkStatus,
  };

  const dossierData = {
    origin: d.dossierOrigin || null,
    dimensions: d.dossierDimensions || null,
    material: d.dossierMaterial || null,
    foundation: d.dossierFoundation || null,
    age: d.dossierAge || null,
    authentication: d.dossierAuthentication || null,
    craftStory: d.dossierCraftStory || null,
    artisan: d.dossierArtisan || null,
    collection: d.dossierCollection || null,
  };

  let savedId = id;
  if (id) {
    // update
    await prisma.artwork.update({
      where: { id },
      data: {
        ...artworkData,
        dossier: {
          upsert: { create: dossierData, update: dossierData },
        },
        images: {
          deleteMany: {},
          create: images.map((img, i) => ({
            url: img.url,
            type: img.type,
            sortOrder: i,
          })),
        },
      },
    });
  } else {
    // create — always start life as chosen status (default DRAFT in form)
    const created = await prisma.artwork.create({
      data: {
        ...artworkData,
        code: generateArtworkCode(d.city),
        dossier: { create: dossierData },
        images: {
          create: images.map((img, i) => ({
            url: img.url,
            type: img.type,
            sortOrder: i,
          })),
        },
      },
    });
    savedId = created.id;
  }

  // The intrinsic value goes through the valuation service (the auction's
  // single source for it), not straight onto the row.
  if (d.intrinsicValue !== undefined) {
    await valuationService.setIntrinsicValue(savedId, D(d.intrinsicValue), "manual");
  }

  revalidatePath("/admin/collection");
  redirect("/admin/collection");
}

export async function updateArtworkStatus(id: string, status: ArtworkStatus) {
  "use server";
  await prisma.artwork.update({ where: { id }, data: { status } });
  revalidatePath("/admin/collection");
  revalidatePath(`/admin/collection/${id}`);
}

export async function archiveArtwork(id: string) {
  "use server";
  await prisma.artwork.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/admin/collection");
}

export type DeleteResult = { ok: boolean; error?: string };

/**
 * Orders and auctions reference an artwork without a cascade, so deleting a
 * piece that has either makes Postgres reject the delete on a foreign key.
 * Check first and say why, rather than letting that surface as a crash.
 *
 * Anything that represents history — an order, or a bid someone placed — is
 * refused outright: archiving is the right move there. An auction nobody has
 * bid on is just a listing, so it goes with the piece.
 */
export async function deleteArtwork(id: string): Promise<DeleteResult> {
  "use server";

  // A work can be a lot in more than one session over its life, so the guard
  // asks about every session it appears in, not just the latest.
  const [orderCount, lots] = await Promise.all([
    prisma.order.count({ where: { artworkId: id } }),
    prisma.auctionLot.findMany({
      where: { artworkId: id },
      select: {
        id: true,
        auctionId: true,
        auction: {
          select: {
            id: true,
            _count: { select: { bids: true, participants: true, lots: true } },
          },
        },
      },
    }),
  ]);
  const participants = lots.reduce((n, l) => n + l.auction._count.participants, 0);
  const bids = lots.reduce((n, l) => n + l.auction._count.bids, 0);

  if (orderCount > 0) {
    return {
      ok: false,
      error: `This work has ${orderCount} order(s) against it and cannot be deleted. Archive it instead.`,
    };
  }

  if (participants > 0) {
    return {
      ok: false,
      error: `This work is in an auction that ${participants} member(s) joined with a deposit and cannot be deleted. Cancel the auction first (deposits are released), then archive.`,
    };
  }

  if (bids > 0) {
    return {
      ok: false,
      error: `This work is in an auction with ${bids} bid(s) and cannot be deleted. Archive it instead.`,
    };
  }

  // Nothing has been bid on it. Drop the lot from each session; a session
  // left with no lots at all goes with it, one with other carpets stays.
  for (const lot of lots) {
    if (lot.auction._count.lots > 1) {
      await prisma.auctionLot.delete({ where: { id: lot.id } });
    } else {
      await prisma.auction.delete({ where: { id: lot.auctionId } });
    }
  }

  await prisma.artwork.delete({ where: { id } });
  revalidatePath("/admin/collection");
  return { ok: true };
}
