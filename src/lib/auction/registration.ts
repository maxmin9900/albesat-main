import type { AuctionStatus } from "@prisma/client";

/**
 * The statuses a lot is publicly visible and open for registration in.
 *
 * Lives here rather than beside the server action because a "use server"
 * module may only export async functions — the page and the action both
 * import it from this plain module.
 */
export const OPEN_FOR_REGISTRATION: AuctionStatus[] = [
  "SCHEDULED",
  "REGISTRATION_OPEN",
  "LIVE",
];

export function isOpenForRegistration(status: AuctionStatus | string) {
  return OPEN_FOR_REGISTRATION.includes(status as AuctionStatus);
}
