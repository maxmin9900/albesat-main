import "server-only";
import { prisma } from "@/lib/prisma";
import { D, type Money } from "./money";
import { AuctionError } from "./errors";

/**
 * Where an artwork's intrinsic value comes from.
 *
 * The auction never asks an AI directly. It asks this interface, and the
 * interface answers from whichever valuation source is plugged in. Today that
 * source is the value an appraiser typed into the admin form; swapping in a
 * model later means adding one class here and changing one line in
 * `valuationService` — the auction service does not change.
 *
 *   ValuationService → (AI valuation agent) → intrinsic value → auction
 */
export interface ValuationService {
  /** the current intrinsic value of a work, or null if none has been recorded */
  getIntrinsicValue(artworkId: string): Promise<Money | null>;
  /** record a value and who produced it */
  setIntrinsicValue(
    artworkId: string,
    value: Money,
    source: string
  ): Promise<void>;
}

/** Reads/writes the value stored on the artwork; the admin form is the appraiser. */
class StoredValuationService implements ValuationService {
  async getIntrinsicValue(artworkId: string) {
    const art = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: { intrinsicValue: true },
    });
    return art?.intrinsicValue ?? null;
  }
  async setIntrinsicValue(artworkId: string, value: Money, source: string) {
    await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        intrinsicValue: value,
        intrinsicValueSource: source,
        intrinsicValuedAt: new Date(),
      },
    });
  }
}

// Swap this for an AI-backed implementation when the valuation agent exists.
export const valuationService: ValuationService = new StoredValuationService();

/** the intrinsic value an auction may be created from — throws if there is none */
export async function requireIntrinsicValue(artworkId: string): Promise<Money> {
  const v = await valuationService.getIntrinsicValue(artworkId);
  if (!v || D(v).lte(0)) {
    throw new AuctionError(
      "NO_INTRINSIC_VALUE",
      "This work has no intrinsic value yet. Record one on the work before opening an auction."
    );
  }
  return D(v);
}
