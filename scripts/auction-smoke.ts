/**
 * End-to-end exercise of the live-auction service against a real Postgres.
 *
 *   DATABASE_URL=postgresql://…/carpet_auction_test \
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/auction-smoke.ts
 *
 * (`--conditions=react-server` resolves the `server-only` guard to its empty
 * build so the service can be imported outside Next.)
 *
 * It creates its own members and work, so it can run against an empty DB, and
 * it asserts every rule in the spec — including that a burst of simultaneous
 * bids yields exactly one accepted bid.
 */
import "./_no-server-only.cjs";
import { PrismaClient } from "@prisma/client";
import * as svc from "../src/lib/auction/service";
import { creditFunds } from "../src/lib/auction/wallet";
import { D } from "../src/lib/auction/money";

const prisma = new PrismaClient();
let failures = 0;
const check = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "  ✓" : "  ✗ FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bal = async (userId: string) => {
  const w = await prisma.wallet.findUnique({ where: { userId } });
  return { a: Number(w?.available ?? 0), l: Number(w?.locked ?? 0) };
};

async function main() {
  const tag = Date.now().toString(36);
  const mk = async (name: string, funds: number) => {
    const u = await prisma.user.create({ data: { fullName: name, email: `${name}-${tag}@test.local`, country: "Oman" } });
    await prisma.$transaction((tx) => creditFunds(tx, u.id, D(funds), { note: "smoke credit" }));
    return u;
  };
  const [alice, bob, carol, dave] = await Promise.all([
    mk("alice", 5000), mk("bob", 5000), mk("carol", 5000), mk("dave", 100),
  ]);
  const art = await prisma.artwork.create({
    data: {
      code: `SMK-${tag}`, title: `Smoke rug ${tag}`, city: "Tabriz", category: "Medallion",
      price: 1000, currency: "OMR", status: "PUBLISHED",
      intrinsicValue: 1000, intrinsicValueSource: "manual", intrinsicValuedAt: new Date(),
    },
  });

  console.log("\n— create —");
  const now = Date.now();
  const a = await svc.createAuction({
    title: `Smoke ${tag}`, lots: [{ artworkId: art.id }], currency: "OMR",
    startAt: new Date(now - 1000),          // already started → goes LIVE at once
    endAt: new Date(now + 6000),            // 6 s of bidding
    depositPercent: 50, bidIncrementPercent: 20, bidCoveragePercent: 100,
    antiSnipingWindowSec: 3, extensionSec: 3, paymentDeadlineMin: 1,
  });
  let cur = await prisma.auction.findUniqueOrThrow({ where: { id: a.id } });
  check("starting price = intrinsic value", Number(cur.startingPrice) === 1000, cur.startingPrice.toString());
  check("legacy basePrice kept in step", Number(cur.basePrice) === 1000);
  check("went LIVE (start in the past)", cur.status === "LIVE", cur.status);

  console.log("\n— join / deposit —");
  const j1 = await svc.joinAuction(a.id, alice.id);
  check("deposit = 50% of intrinsic (500)", j1.depositAmount === "500.00", j1.depositAmount);
  check("alias assigned", /^Bidder #[A-Z]\d{2}$/.test(j1.alias), j1.alias);
  const j1again = await svc.joinAuction(a.id, alice.id);
  check("re-join is idempotent", j1again.alreadyJoined && j1again.alias === j1.alias);
  await svc.joinAuction(a.id, bob.id);
  await svc.joinAuction(a.id, carol.id);
  let ab = await bal(alice.id);
  check("alice wallet: 4500 available / 500 locked", ab.a === 4500 && ab.l === 500, JSON.stringify(ab));
  let daveErr = "";
  try { await svc.joinAuction(a.id, dave.id); } catch (e) { daveErr = (e as Error).message; }
  check("dave (100 OMR) refused: insufficient funds", /available balance is 100/.test(daveErr), daveErr);

  console.log("\n— simultaneous bids (5 × 1000 at once) —");
  const burst = await Promise.all(
    [alice, bob, carol, alice, bob].map((u, i) =>
      svc.placeBid({ auctionId: a.id, userId: u.id, amount: D(1000), idempotencyKey: `burst-${i}-${tag}` })
    )
  );
  const accepted = burst.filter((r) => r.accepted);
  check("exactly ONE of five simultaneous 1000 bids accepted", accepted.length === 1, `${accepted.length} accepted`);
  check("the other four rejected as too low", burst.filter((r) => !r.accepted && r.code === "BID_TOO_LOW").length === 4);
  cur = await prisma.auction.findUniqueOrThrow({ where: { id: a.id } });
  check("currentPrice = 1000, sequence = 1", Number(cur.currentPrice) === 1000 && cur.bidSequence === 1);

  console.log("\n— compound minimum —");
  const low = await svc.placeBid({ auctionId: a.id, userId: bob.id, amount: D(1100) });
  check("1100 rejected (min is 1000×1.2 = 1200)", !low.accepted && low.code === "BID_TOO_LOW", low.accepted ? "" : low.reason);
  const b2 = await svc.placeBid({ auctionId: a.id, userId: bob.id, amount: D(1200), idempotencyKey: `b2-${tag}` });
  check("1200 accepted", b2.accepted);
  const replay = await svc.placeBid({ auctionId: a.id, userId: bob.id, amount: D(1200), idempotencyKey: `b2-${tag}` });
  check("same idempotency key replays, no second bid", replay.accepted && replay.bidId === (b2.accepted ? b2.bidId : ""), "");
  const b3low = await svc.placeBid({ auctionId: a.id, userId: carol.id, amount: D(1439.99) });
  check("1439.99 rejected (min 1440)", !b3low.accepted);
  const b3 = await svc.placeBid({ auctionId: a.id, userId: carol.id, amount: D(1440) });
  check("1440 accepted (compound on current 1200)", b3.accepted);
  cur = await prisma.auction.findUniqueOrThrow({ where: { id: a.id } });
  check("sequence = 3, current 1440", cur.bidSequence === 3 && Number(cur.currentPrice) === 1440);

  console.log("\n— financial capacity —");
  // alice: 4500 avail + 500 own deposit = 5000 capacity; a 6000 bid is over cover
  const big = await svc.placeBid({ auctionId: a.id, userId: alice.id, amount: D(6000) });
  check("6000 bid rejected: beyond alice's cover (5000)", !big.accepted && big.code === "INSUFFICIENT_CAPACITY", big.accepted ? "" : big.reason);
  const rejectedRows = await prisma.bid.count({ where: { auctionId: a.id, status: "REJECTED" } });
  check("rejected bids are recorded, immutable, no sequence", rejectedRows >= 6, `${rejectedRows} rows`);
  const seqRows = await prisma.bid.findMany({ where: { auctionId: a.id, sequence: { not: null } }, orderBy: { sequence: "asc" } });
  check("accepted bids numbered 1..3 with no gaps", seqRows.map((b) => b.sequence).join(",") === "1,2,3");

  console.log("\n— anti-sniping —");
  // wait until inside the last 3 s, then bid
  const msLeft = cur.endAt.getTime() - Date.now();
  await sleep(Math.max(0, msLeft - 2000));
  const endBefore = cur.endAt;
  const late = await svc.placeBid({ auctionId: a.id, userId: alice.id, amount: D(1728) });
  cur = await prisma.auction.findUniqueOrThrow({ where: { id: a.id } });
  check("late bid accepted and extended", late.accepted && !!late.extendedTo, JSON.stringify(late));
  check("endAt moved by +3 s", cur.endAt.getTime() - endBefore.getTime() === 3000, `${cur.endAt.getTime() - endBefore.getTime()} ms`);
  check("extensionCount = 1", cur.extensionCount === 1);

  console.log("\n— hammer → winner → deposits —");
  await sleep(cur.endAt.getTime() - Date.now() + 300);
  await svc.runLifecycle(a.id);
  cur = await prisma.auction.findUniqueOrThrow({ where: { id: a.id } });
  const winner = await prisma.auctionWinner.findUnique({ where: { auctionId: a.id } });
  check("status PAYMENT_PENDING", cur.status === "PAYMENT_PENDING", cur.status);
  check("winner = alice at 1728", winner?.userId === alice.id && Number(winner?.finalAmount) === 1728);
  const order = await prisma.order.findFirst({ where: { artworkId: art.id, source: "AUCTION" } });
  check("order raised for the winner (PENDING)", !!order && order.paymentStatus === "PENDING" && Number(order.amount) === 1728);
  const bb = await bal(bob.id), cb = await bal(carol.id);
  check("bob's deposit released (5000/0)", bb.a === 5000 && bb.l === 0, JSON.stringify(bb));
  check("carol's deposit released (5000/0)", cb.a === 5000 && cb.l === 0, JSON.stringify(cb));
  ab = await bal(alice.id);
  check("alice's deposit still locked (4500/500)", ab.a === 4500 && ab.l === 500, JSON.stringify(ab));

  console.log("\n— settlement —");
  let notWinner = "";
  try { await svc.payBalance(a.id, bob.id); } catch (e) { notWinner = (e as Error).message; }
  check("bob cannot pay for alice's lot", /Only the winning bidder/.test(notWinner));
  await svc.payBalance(a.id, alice.id);
  cur = await prisma.auction.findUniqueOrThrow({ where: { id: a.id } });
  ab = await bal(alice.id);
  check("status COMPLETED", cur.status === "COMPLETED", cur.status);
  check("alice paid 1728 − 500 = 1228 from available → 3272 / 0", ab.a === 3272 && ab.l === 0, JSON.stringify(ab));
  const artAfter = await prisma.artwork.findUniqueOrThrow({ where: { id: art.id } });
  const orderAfter = await prisma.order.findUniqueOrThrow({ where: { id: order!.id } });
  check("artwork SOLD, order PAID", artAfter.status === "SOLD" && orderAfter.paymentStatus === "PAID");
  const part = await prisma.auctionParticipant.findUniqueOrThrow({ where: { auctionId_userId: { auctionId: a.id, userId: alice.id } } });
  check("alice's deposit APPLIED", part.depositStatus === "APPLIED");
  let again = "";
  try { await svc.payBalance(a.id, alice.id); } catch (e) { again = (e as Error).message; }
  check("paying twice is refused", /not awaiting payment/.test(again));

  console.log("\n— audit trail —");
  const types = (await prisma.auctionEvent.findMany({ where: { auctionId: a.id }, orderBy: { id: "asc" } })).map((e) => e.type);
  for (const t of ["AUCTION_CREATED", "AUCTION_STARTED", "USER_JOINED", "DEPOSIT_LOCKED", "BID_PLACED", "BID_REJECTED", "BID_OUTBID", "AUCTION_EXTENDED", "AUCTION_ENDED", "WINNER_SELECTED", "PAYMENT_STARTED", "DEPOSIT_RELEASED", "DEPOSIT_APPLIED", "PAYMENT_COMPLETED", "AUCTION_COMPLETED"]) {
    check(`event ${t}`, types.includes(t as never));
  }
  const ledger = await prisma.walletTransaction.count({ where: { wallet: { userId: alice.id } } });
  check("alice's ledger: credit, lock, debit, apply = 4 rows", ledger === 4, `${ledger}`);

  console.log("\n— second auction: payment deadline passes → SETTLEMENT_FAILED, deposit released —");
  const art2 = await prisma.artwork.create({ data: { code: `SMK2-${tag}`, title: `Smoke rug 2 ${tag}`, city: "Qom", category: "Silk", price: 200, currency: "OMR", status: "PUBLISHED", intrinsicValue: 200 } });
  const a2 = await svc.createAuction({ title: `Smoke2 ${tag}`, lots: [{ artworkId: art2.id }], currency: "OMR", startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 1500), antiSnipingWindowSec: 0, paymentDeadlineMin: 1 });
  await svc.joinAuction(a2.id, bob.id);
  await svc.placeBid({ auctionId: a2.id, userId: bob.id, amount: D(200) });
  await sleep(1800);
  await svc.runLifecycle(a2.id);
  // simulate the deadline passing
  await prisma.auction.update({ where: { id: a2.id }, data: { paymentDueAt: new Date(Date.now() - 1000) } });
  await svc.runLifecycle(a2.id);
  const a2After = await prisma.auction.findUniqueOrThrow({ where: { id: a2.id } });
  const bb2 = await bal(bob.id);
  check("SETTLEMENT_FAILED", a2After.status === "SETTLEMENT_FAILED", a2After.status);
  check("bob's deposit released (policy RELEASE): 5000/0", bb2.a === 5000 && bb2.l === 0, JSON.stringify(bb2));
  const art2After = await prisma.artwork.findUniqueOrThrow({ where: { id: art2.id } });
  check("work stays PUBLISHED (not sold)", art2After.status === "PUBLISHED");

  console.log("\n— illegal transitions —");
  let illegal = "";
  try { await svc.startNow(a.id); } catch (e) { illegal = (e as Error).message; }
  check("COMPLETED → LIVE refused by the state machine", /cannot go from COMPLETED to LIVE/.test(illegal), illegal);

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
