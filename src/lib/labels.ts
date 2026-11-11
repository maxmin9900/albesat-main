import {
  DEFAULT_CATEGORIES,
  DEFAULT_CITIES,
} from "@/lib/taxonomy-defaults";

// English labels + badge tones for all enum values

export type Tone =
  | "gold"
  | "green"
  | "blue"
  | "red"
  | "gray"
  | "purple"
  | "amber";

export const ARTWORK_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "gray" },
  PRIVATE: { label: "Private", tone: "purple" },
  PUBLISHED: { label: "Published", tone: "green" },
  SOLD: { label: "Sold", tone: "amber" },
  ARCHIVED: { label: "Archived", tone: "gray" },
};

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "gray" },
  CONFIRMED: { label: "Confirmed", tone: "blue" },
  PREPARING: { label: "Preparing", tone: "amber" },
  PACKED: { label: "Packed", tone: "amber" },
  SHIPPED: { label: "Shipped", tone: "blue" },
  DELIVERED: { label: "Delivered", tone: "green" },
  COMPLETED: { label: "Completed", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Payment pending", tone: "gray" },
  PAID: { label: "Paid", tone: "green" },
  FAILED: { label: "Failed", tone: "red" },
  REFUNDED: { label: "Refunded", tone: "purple" },
};

export const AUCTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "gray" },
  SCHEDULED: { label: "Scheduled", tone: "blue" },
  REGISTRATION_OPEN: { label: "Registration open", tone: "purple" },
  LIVE: { label: "Live", tone: "green" },
  ENDED: { label: "Ended", tone: "amber" },
  PAYMENT_PENDING: { label: "Awaiting payment", tone: "amber" },
  COMPLETED: { label: "Completed", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
  SETTLEMENT_FAILED: { label: "Settlement failed", tone: "red" },
};

export const DEPOSIT_STATUS: Record<string, { label: string; tone: Tone }> = {
  LOCKED: { label: "Locked", tone: "blue" },
  RELEASED: { label: "Released", tone: "gray" },
  APPLIED: { label: "Applied to purchase", tone: "green" },
  FORFEITED: { label: "Forfeited", tone: "red" },
};

export const BID_STATUS: Record<string, { label: string; tone: Tone }> = {
  VALID: { label: "Valid", tone: "blue" },
  OUTBID: { label: "Outbid", tone: "gray" },
  WINNING: { label: "Winning", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  SUSPICIOUS: { label: "Suspicious", tone: "red" },
};

export const KYC_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "gray" },
  VERIFIED: { label: "Verified", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export const IMAGE_TYPE: Record<string, string> = {
  MAIN: "Main image",
  GALLERY: "Gallery",
  WEAVE_CLOSEUP: "Weave close-up",
  BACK: "Back of rug",
  KNOT_DETAIL: "Knot detail",
};

export const ORDER_STATUS_FLOW = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

// The weaving origins and style categories the archive shipped with.
//
// These are no longer the source of truth — the City and Category tables are,
// and they are edited at /admin/taxonomy. They stay here, derived from the
// same seed, only for code that needs a list without touching the database.
// Anything that decides what a visitor or an admin sees should read
// src/lib/taxonomy.ts instead.
export const PERSIAN_CITIES = DEFAULT_CITIES.map((c) => c.name);

export const CATEGORIES = DEFAULT_CATEGORIES;
