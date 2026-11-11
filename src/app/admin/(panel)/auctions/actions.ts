"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as auction from "@/lib/auction/service";
import { isAuctionError } from "@/lib/auction/errors";
import { AUCTION_DEFAULTS } from "@/lib/auction/config";
import { muscatLocalToUtc } from "@/lib/auction/invitation";

const pct = (msg: string) => z.coerce.number().min(0, msg).max(100, msg);
const secs = z.coerce.number().int().min(0).max(3600);

// an empty box means "not recorded", never zero or an empty string
const optText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );
const optMoney = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().nonnegative("Must be a positive amount").optional()
);
const optInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().positive("Lot number must be a positive whole number").optional()
);

/** One carpet in the session, with the catalogue entry printed for it. */
const lotSchema = z
  .object({
    artworkId: z.string().min(1, "Pick a work"),
    startingPrice: optMoney,
    lotNumber: optInt,
    lotName: optText(120),
    origin: optText(120),
    era: optText(60),
    lotDimensions: optText(80),
    materials: optText(200),
    weave: optText(120),
    condition: optText(300),
    estimateLow: optMoney,
    estimateHigh: optMoney,
    publishedReserve: optMoney,
    lotNote: optText(2000),
  })
  .refine(
    (l) =>
      l.estimateLow === undefined ||
      l.estimateHigh === undefined ||
      l.estimateHigh >= l.estimateLow,
    { message: "The high estimate must be at or above the low one" }
  );

/** The session's own fields, shared by creating one and editing one. */
const sessionFields = {
  title: z.string().min(1, "Title is required"),
  currency: z.enum(["OMR", "IRR", "USD", "EUR", "AED"]),
  registrationOpensAt: z.string().optional(),
  startAt: z.string().min(1, "Start date is required"),
  endAt: z.string().min(1, "End date is required"),
  depositPercent: pct("Deposit % must be 0–100").default(AUCTION_DEFAULTS.depositPercent),
  bidIncrementPercent: z.coerce.number().min(0.01, "Increment must be positive").max(500).default(AUCTION_DEFAULTS.bidIncrementPercent),
  bidCoveragePercent: pct("Coverage % must be 0–100").default(AUCTION_DEFAULTS.bidCoveragePercent),
  antiSnipingWindowSec: secs.default(AUCTION_DEFAULTS.antiSnipingWindowSec),
  extensionSec: secs.default(AUCTION_DEFAULTS.extensionSec),
  paymentDeadlineMin: z.coerce.number().int().min(1).max(60 * 24 * 14).default(AUCTION_DEFAULTS.paymentDeadlineMin),
  failedPaymentDepositPolicy: z.enum(["RELEASE", "FORFEIT"]).default(AUCTION_DEFAULTS.failedPaymentDepositPolicy),
  offerToNextBidder: z.preprocess((v) => v === "on" || v === "true", z.boolean()).default(AUCTION_DEFAULTS.offerToNextBidder),

  // ---- the printed invitation (all optional) ----
  venueName: optText(120),
  venueAddress: optText(200),
  venueHall: optText(200),
  intro: optText(500),
  viewingFrom: optText(20),
  viewingTo: optText(20),
};

/**
 * The timing rules. Written as plain predicates and applied to each schema
 * directly — wrapping them in a generic helper erased the object's own
 * inference and turned every field downstream into `any`.
 */
type Timing = { startAt: string; endAt: string; registrationOpensAt?: string };

const startIsReal = (d: Timing) => muscatLocalToUtc(d.startAt) !== null;
const endsAfterStart = (d: Timing) => {
  const a = muscatLocalToUtc(d.startAt);
  const b = muscatLocalToUtc(d.endAt);
  return !a || !b || b.getTime() > a.getTime();
};
const opensBeforeStart = (d: Timing) => {
  if (!d.registrationOpensAt) return true;
  const a = muscatLocalToUtc(d.startAt);
  const r = muscatLocalToUtc(d.registrationOpensAt);
  return !a || !r || r.getTime() <= a.getTime();
};

const BAD_START = { message: "Invalid start date", path: ["startAt"] };
const BAD_END = { message: "End must be after start", path: ["endAt"] };
const BAD_OPEN = {
  message: "Registration must open before the start",
  path: ["registrationOpensAt"],
};

/** editing a session: its own fields only, the lots are edited one by one */
const sessionSchema = z
  .object(sessionFields)
  .refine(startIsReal, BAD_START)
  .refine(endsAfterStart, BAD_END)
  .refine(opensBeforeStart, BAD_OPEN);

/** creating one: the same fields, plus the carpets it opens with */
const schema = z
  .object({
    ...sessionFields,
    // The carpets in this session, as a JSON array — a session holds one or
    // more, each with its own catalogue entry, so they cannot be flat fields.
    lots: z.preprocess((v) => {
      if (typeof v !== "string") return v;
      try {
        return JSON.parse(v);
      } catch {
        return undefined;
      }
    }, z.array(lotSchema).min(1, "Add at least one carpet to this session")),
  })
  .refine(startIsReal, BAD_START)
  .refine(endsAfterStart, BAD_END)
  .refine(opensBeforeStart, BAD_OPEN);

export type AuctionState = { error?: string; fieldErrors?: Record<string, string> };

export async function createAuction(_prev: AuctionState, formData: FormData): Promise<AuctionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the form errors.", fieldErrors };
  }
  const d = parsed.data;

  const ids = d.lots.map((l) => l.artworkId);
  if (new Set(ids).size !== ids.length) {
    return { error: "The same carpet is listed twice in this session." };
  }

  const works = await prisma.artwork.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, status: true },
  });
  const byId = new Map(works.map((w) => [w.id, w]));
  for (const id of ids) {
    const w = byId.get(id);
    if (!w) return { error: "One of the chosen works no longer exists." };
    if (w.status !== "PUBLISHED") {
      return { error: `"${w.title}" is not available — only published works can go to auction.` };
    }
  }

  // A carpet may head a later session, but not be in two open ones at once.
  const clash = await prisma.auctionLot.findFirst({
    where: {
      artworkId: { in: ids },
      auction: { status: { in: ["DRAFT", "SCHEDULED", "REGISTRATION_OPEN", "LIVE"] } },
    },
    include: { artwork: { select: { title: true } }, auction: { select: { title: true } } },
  });
  if (clash) {
    return {
      error: `"${clash.artwork.title}" is already in the session "${clash.auction.title}".`,
    };
  }

  try {
    await auction.createAuction({
      title: d.title,
      lots: d.lots,
      currency: d.currency,
      // the boxes are Muscat wall-clock, not the container's zone
      startAt: muscatLocalToUtc(d.startAt) ?? new Date(d.startAt),
      endAt: muscatLocalToUtc(d.endAt) ?? new Date(d.endAt),
      registrationOpensAt: d.registrationOpensAt
        ? (muscatLocalToUtc(d.registrationOpensAt) ?? new Date(d.registrationOpensAt))
        : null,
      venueName: d.venueName,
      venueAddress: d.venueAddress,
      venueHall: d.venueHall,
      intro: d.intro,
      viewingFrom: d.viewingFrom,
      viewingTo: d.viewingTo,
      depositPercent: d.depositPercent,
      bidIncrementPercent: d.bidIncrementPercent,
      bidCoveragePercent: d.bidCoveragePercent,
      antiSnipingWindowSec: d.antiSnipingWindowSec,
      extensionSec: d.extensionSec,
      paymentDeadlineMin: d.paymentDeadlineMin,
      failedPaymentDepositPolicy: d.failedPaymentDepositPolicy,
      offerToNextBidder: d.offerToNextBidder,
    });
  } catch (e) {
    if (isAuctionError(e)) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin/auctions");
  redirect("/admin/auctions");
}

/**
 * Update one lot's catalogue entry.
 *
 * Only the printed details are editable: which carpet a lot IS cannot change
 * here, because people may already have registered for the sale on the
 * strength of seeing it. Swap the work by removing the lot and adding it
 * again instead.
 */
export async function updateLot(
  lotId: string,
  values: Record<string, string>
): Promise<AuctionState> {
  if (!(await getSession())) return { error: "Your session has expired." };

  const parsed = lotSchema.safeParse({ artworkId: "x", ...values });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const d = parsed.data;

  const lot = await prisma.auctionLot.findUnique({
    where: { id: lotId },
    select: { auctionId: true },
  });
  if (!lot) return { error: "That lot no longer exists." };

  // undefined means "not filled in", and has to land as NULL rather than be
  // skipped — clearing a field must actually clear it
  const orNull = <T,>(v: T | undefined) => (v === undefined ? null : v);

  await prisma.auctionLot.update({
    where: { id: lotId },
    data: {
      lotNumber: orNull(d.lotNumber),
      lotName: orNull(d.lotName),
      origin: orNull(d.origin),
      era: orNull(d.era),
      lotDimensions: orNull(d.lotDimensions),
      materials: orNull(d.materials),
      weave: orNull(d.weave),
      condition: orNull(d.condition),
      estimateLow: orNull(d.estimateLow),
      estimateHigh: orNull(d.estimateHigh),
      publishedReserve: orNull(d.publishedReserve),
      lotNote: orNull(d.lotNote),
      startingPrice: orNull(d.startingPrice),
    },
  });

  revalidatePath("/admin/auctions");
  revalidatePath(`/admin/auctions/${lot.auctionId}`);
  revalidatePath("/auctions");
  revalidatePath(`/auctions/lot/${lotId}`);
  return {};
}

/** Update the session itself: its name, its timing, its invitation. */
export async function updateSession(
  auctionId: string,
  values: Record<string, string>
): Promise<AuctionState> {
  if (!(await getSession())) return { error: "Your session has expired." };

  const parsed = sessionSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const d = parsed.data;

  const startAt = muscatLocalToUtc(d.startAt);
  const endAt = muscatLocalToUtc(d.endAt);
  if (!startAt || !endAt) return { error: "Those dates could not be read." };

  await prisma.auction.update({
    where: { id: auctionId },
    data: {
      title: d.title,
      currency: d.currency,
      startAt,
      endAt,
      registrationOpensAt: d.registrationOpensAt
        ? muscatLocalToUtc(d.registrationOpensAt)
        : null,
      venueName: d.venueName ?? null,
      venueAddress: d.venueAddress ?? null,
      venueHall: d.venueHall ?? null,
      intro: d.intro ?? null,
      viewingFrom: d.viewingFrom ?? null,
      viewingTo: d.viewingTo ?? null,
    },
  });

  revalidatePath("/admin/auctions");
  revalidatePath(`/admin/auctions/${auctionId}`);
  revalidatePath("/auctions");
  return {};
}

/**
 * Take one carpet out of a session.
 *
 * The session's headline work is the one the live room and the legacy
 * reports hang off, so removing it would orphan them — that lot stays until
 * the whole session goes.
 */
export async function removeLot(lotId: string): Promise<ToggleResult> {
  if (!(await getSession())) return { ok: false, error: "Your session has expired." };

  const lot = await prisma.auctionLot.findUnique({
    where: { id: lotId },
    include: { auction: { select: { id: true, artworkId: true, _count: { select: { lots: true } } } } },
  });
  if (!lot) return { ok: true };

  if (lot.auction._count.lots <= 1) {
    return {
      ok: false,
      error: "This is the session's only carpet. Cancel the session instead.",
    };
  }
  if (lot.artworkId === lot.auction.artworkId) {
    return {
      ok: false,
      error:
        "This is the session's headline carpet and cannot be removed on its own.",
    };
  }

  await prisma.auctionLot.delete({ where: { id: lotId } });
  revalidatePath("/admin/auctions");
  revalidatePath(`/admin/auctions/${lot.auction.id}`);
  revalidatePath("/auctions");
  return { ok: true };
}

/* ---- lifecycle buttons ---------------------------------------------- */

const done = (id: string) => {
  revalidatePath("/admin/auctions");
  revalidatePath(`/admin/auctions/${id}`);
  revalidatePath("/admin/winners");
  revalidatePath("/auctions");
};

const guard = async (id: string, fn: () => Promise<unknown>) => {
  try {
    await fn();
    done(id);
    return { ok: true as const };
  } catch (e) {
    if (isAuctionError(e)) return { ok: false as const, error: e.message };
    throw e;
  }
};

export async function publishAuction(id: string) {
  return guard(id, () => auction.publishAuction(id));
}
export async function openRegistration(id: string) {
  return guard(id, () => auction.openRegistration(id));
}
export async function startAuctionNow(id: string) {
  return guard(id, () => auction.startNow(id));
}
export async function endAuctionNow(id: string) {
  return guard(id, () => auction.endNow(id));
}
export async function cancelAuction(id: string) {
  return guard(id, () => auction.cancelAuction(id, "cancelled by admin"));
}
export async function confirmPayment(id: string) {
  const admin = await getSession();
  return guard(id, () => auction.confirmOfflinePayment(id, admin?.sub));
}
export async function failSettlement(id: string) {
  return guard(id, () => auction.failSettlement(id, "declared failed by admin"));
}

// ---------------------------------------------------------------------------
// Put a work on auction, or take it off — the one-click path from the
// collection list, for an admin who does not want the full create form.
// ---------------------------------------------------------------------------

export type ToggleResult = { ok: boolean; error?: string };

/** How long a quick-listed lot runs before it needs attention. */
const QUICK_AUCTION_DAYS = 14;

/**
 * List a work for auction with sensible defaults.
 *
 * The starting price is the work's AI/manual intrinsic value when it has one,
 * and its catalogue price otherwise — the same rule the create form applies,
 * just without asking. It opens in REGISTRATION_OPEN so it appears on the
 * public auctions page immediately and visitors can register their interest.
 */
export async function putArtworkOnAuction(
  artworkId: string
): Promise<ToggleResult> {
  if (!(await getSession())) return { ok: false, error: "Your session has expired." };

  const art = await prisma.artwork.findUnique({ where: { id: artworkId } });
  if (!art) return { ok: false, error: "That work no longer exists." };

  // is this carpet already a lot in some session?
  const lot = await prisma.auctionLot.findFirst({
    where: { artworkId },
    orderBy: { createdAt: "desc" },
    include: { auction: true },
  });
  const existing = lot?.auction ?? null;
  if (existing) {
    // already listed once — just bring it back onto the public page
    if (existing.status === "REGISTRATION_OPEN" || existing.status === "LIVE") {
      return { ok: true };
    }
    await prisma.auction.update({
      where: { id: existing.id },
      data: {
        status: "REGISTRATION_OPEN",
        endAt:
          existing.endAt > new Date()
            ? existing.endAt
            : new Date(Date.now() + QUICK_AUCTION_DAYS * 86_400_000),
      },
    });
    revalidateAuctionViews();
    return { ok: true };
  }

  const starting =
    art.intrinsicValue && Number(art.intrinsicValue) > 0
      ? art.intrinsicValue
      : art.price;

  // a session of one, so the gavel button stays a single click
  await prisma.auction.create({
    data: {
      title: art.title,
      artworkId: art.id,
      currency: art.currency,
      basePrice: starting,
      startingPrice: starting,
      currentPrice: 0,
      minBidIncrement: 0,
      startAt: new Date(),
      endAt: new Date(Date.now() + QUICK_AUCTION_DAYS * 86_400_000),
      status: "REGISTRATION_OPEN",
      registrationOpensAt: new Date(),
      lots: {
        create: {
          artworkId: art.id,
          sortOrder: 0,
          startingPrice: starting,
          lotName: art.title,
          origin: art.city,
          era: art.approxAge,
          lotDimensions: art.dimensions,
          materials: art.pileMaterial,
          condition: art.condition,
        },
      },
    },
  });

  revalidateAuctionViews();
  return { ok: true };
}

/**
 * Take a work off auction.
 *
 * A lot nobody has touched is deleted outright, so the work is free to be
 * listed again cleanly. One that already has bids, participants or people
 * registered is a record of something that happened — that one is cancelled,
 * which hides it from the public page while keeping the history.
 */
export async function removeArtworkFromAuction(
  artworkId: string
): Promise<ToggleResult> {
  if (!(await getSession())) return { ok: false, error: "Your session has expired." };

  const lot = await prisma.auctionLot.findFirst({
    where: { artworkId },
    orderBy: { createdAt: "desc" },
    include: {
      auction: {
        select: {
          id: true,
          _count: {
            select: { bids: true, participants: true, registrations: true, lots: true },
          },
        },
      },
    },
  });
  if (!lot) return { ok: true };
  const a = lot.auction;

  const touched =
    a._count.bids > 0 || a._count.participants > 0 || a._count.registrations > 0;

  if (touched) {
    // people are attached to this session — never delete it. With other lots
    // still in it, only this carpet leaves; on its own, the session is
    // cancelled, which hides it while keeping the history.
    if (a._count.lots > 1) {
      await prisma.auctionLot.delete({ where: { id: lot.id } });
    } else {
      await prisma.auction.update({
        where: { id: a.id },
        data: { status: "CANCELLED" },
      });
    }
  } else if (a._count.lots > 1) {
    await prisma.auctionLot.delete({ where: { id: lot.id } });
  } else {
    await prisma.auction.delete({ where: { id: a.id } });
  }

  revalidateAuctionViews();
  return { ok: true };
}

function revalidateAuctionViews() {
  revalidatePath("/admin/collection");
  revalidatePath("/admin/auctions");
  revalidatePath("/auctions");
}
