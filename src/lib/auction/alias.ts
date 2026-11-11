/**
 * "Bidder #A21" — what other members see instead of a name.
 *
 * Deterministic per (auction, user) so the same member keeps the same alias
 * across reloads, but not reversible and not shared between auctions. The
 * caller checks uniqueness under the auction row lock and bumps `salt` on the
 * rare collision.
 *
 * Plain-JS hash on purpose (FNV-1a): no `node:crypto`, so this module is safe
 * to reach from any bundle Next builds, Edge included. Nothing here needs to
 * be cryptographic — it only has to be stable and spread evenly.
 */
function fnv1a(input: string, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function bidderAlias(auctionId: string, userId: string, salt = 0) {
  const key = `${auctionId}:${userId}:${salt}`;
  const h1 = fnv1a(key);
  const h2 = fnv1a(key, h1 || 0x9e3779b9); // second pass, seeded by the first
  const letter = String.fromCharCode(65 + (h1 % 26)); // A–Z
  const num = 10 + (h2 % 90); // 10–99
  return `Bidder #${letter}${num}`;
}
