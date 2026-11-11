/**
 * The live auction rooms (/auctions/[id], SSE, deposits, the floor) are a
 * local-only feature for now — the client wants them demoed on our machine,
 * not on the production server. One switch controls all of it:
 *
 *   LIVE_AUCTION_ROOMS=1  → rooms, streams and the lifecycle sweeper are on
 *   unset / anything else → the site behaves as before the module existed:
 *                           the hall lists live auctions and members bid
 *                           inline with the flat minimum increment
 *
 * Set to "1" in docker-compose.local.yml; deliberately absent from
 * docker-compose.prod.yml.
 */
export const LIVE_AUCTION_ROOMS = process.env.LIVE_AUCTION_ROOMS === "1";
