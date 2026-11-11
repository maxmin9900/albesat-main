/**
 * Demo opponents. Sits in a live auction and bids against you, so one browser
 * and one session is enough to show the room working.
 *
 *   docker compose -p carpetlocal -f docker-compose.local.yml exec -d \
 *     -e ROUNDS=5 -e INTERVAL=8 web npx tsx scripts/auction-bot.ts
 *
 * Environment:
 *   AUCTION   auction id (default: the newest LIVE one)
 *   BOTS      how many opponents to seat            (default 4)
 *   ROUNDS    how many times they will outbid you   (default 5)
 *   INTERVAL  seconds before they answer your bid   (default 8)
 *   MODE      react  — only bid when someone else leads (default)
 *             always — keep bidding on a timer regardless
 *   STOP_AT   stop once the price reaches this      (default: no limit)
 *
 * After ROUNDS the opponents fall silent, so your next bid wins the lot. The
 * bots go through the real service — deposits are genuinely locked and the
 * compound minimum genuinely applies, exactly like a human bidder.
 */
import "./_no-server-only.cjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { creditFunds } from "../src/lib/auction/wallet";
import { D, minNextBid } from "../src/lib/auction/money";
import * as svc from "../src/lib/auction/service";

const prisma = new PrismaClient();

const BOTS = Math.max(1, Math.min(10, Number(process.env.BOTS ?? 4)));
const ROUNDS = Math.max(0, Number(process.env.ROUNDS ?? 5));
const INTERVAL = Math.max(2, Number(process.env.INTERVAL ?? 8)) * 1000;
const MODE = process.env.MODE === "always" ? "always" : "react";
const STOP_AT = process.env.STOP_AT ? Number(process.env.STOP_AT) : null;
const PASSWORD = "Test@12345";

const NAMES = [
  "Fatma Al Kindi", "Yousuf Al Harthy", "Amal Al Siyabi", "Khalid Al Maamari",
  "Huda Al Riyami", "Saif Al Hinai", "Muna Al Wahaibi", "Talal Al Busaidi",
  "Rania Al Amri", "Faisal Al Shukaili",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (m: string) => console.log(`  ${stamp()}  ${m}`);

async function main() {
  const auction = process.env.AUCTION
    ? await prisma.auction.findUniqueOrThrow({ where: { id: process.env.AUCTION } })
    : await prisma.auction.findFirstOrThrow({
        where: { status: "LIVE" },
        orderBy: { createdAt: "desc" },
      });

  console.log(`\n  Auction : ${auction.title}`);
  console.log(`  Mode    : ${MODE} · ${BOTS} opponents · answering after ${INTERVAL / 1000}s`);
  console.log(`  Rounds  : ${ROUNDS}  (after that they stop and your next bid wins)`);
  if (STOP_AT) console.log(`  Ceiling : ${STOP_AT} ${auction.currency}`);
  console.log("");

  // ---- seat the opponents ------------------------------------------------
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const bots: { id: string; alias: string }[] = [];
  for (let i = 0; i < BOTS; i++) {
    const email = `demo${i + 1}@test.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        fullName: NAMES[i % NAMES.length],
        email,
        mobile: `+968910000${(i + 1).toString().padStart(2, "0")}`,
        passwordHash,
        address: "Muscat, Oman",
        country: "Oman",
        kycStatus: "VERIFIED",
      },
    });
    try {
      const j = await svc.joinAuction(auction.id, user.id);
      bots.push({ id: user.id, alias: j.alias });
      log(`${j.alias} takes a seat`);
    } catch (e) {
      // most likely: not enough funds to lodge the deposit — give them some
      const deposit = D(auction.startingPrice).mul(D(auction.depositPercent)).div(100);
      await prisma.$transaction((tx) =>
        creditFunds(tx, user.id, deposit.mul(4), { note: "demo bot float" })
      );
      try {
        const j = await svc.joinAuction(auction.id, user.id);
        bots.push({ id: user.id, alias: j.alias });
        log(`${j.alias} takes a seat`);
      } catch (e2) {
        log(`could not seat ${email}: ${(e2 as Error).message}`);
      }
    }
  }
  if (bots.length === 0) throw new Error("no opponents could be seated");
  console.log("");

  /** make sure this bot can cover `amount` before it bids */
  const fund = async (userId: string, amount: ReturnType<typeof D>) => {
    const w = await prisma.wallet.findUnique({ where: { userId } });
    const need = amount.mul(1.5); // headroom for the next couple of rounds
    if (D(w?.available ?? 0).gte(need)) return;
    await prisma.$transaction((tx) =>
      creditFunds(tx, userId, need.sub(D(w?.available ?? 0)), { note: "demo bot top-up" })
    );
  };

  // ---- the loop ----------------------------------------------------------
  let spent = 0;
  let idleTicks = 0;
  while (spent < ROUNDS) {
    await sleep(INTERVAL);

    const a = await prisma.auction.findUnique({ where: { id: auction.id } });
    if (!a) return log("auction disappeared");
    if (a.status !== "LIVE") {
      log(`auction is ${a.status} — the opponents stand down`);
      return;
    }
    if (STOP_AT && Number(a.currentPrice) >= STOP_AT) {
      log(`price reached the ceiling (${a.currentPrice}) — the opponents stand down`);
      return;
    }

    // who is leading right now?
    const leader = await prisma.bid.findFirst({
      where: { auctionId: a.id, status: "WINNING" },
      select: { userId: true },
    });
    const botIds = new Set(bots.map((b) => b.id));
    const humanLeads = !!leader && !botIds.has(leader.userId);

    if (MODE === "react" && a.bidSequence > 0 && !humanLeads) {
      idleTicks++;
      if (idleTicks % 4 === 0) {
        log(`waiting — ${bots.find((b) => b.id === leader?.userId)?.alias ?? "an opponent"} still leads at ${Number(a.currentPrice)}. Your move.`);
      }
      continue;
    }
    idleTicks = 0;

    // pick an opponent who is not already the leader
    const candidates = bots.filter((b) => b.id !== leader?.userId);
    const bot = candidates[Math.floor(Math.random() * candidates.length)] ?? bots[0];
    const next = minNextBid(D(a.currentPrice), D(a.bidIncrementPercent), a.bidSequence > 0);

    await fund(bot.id, next);
    const r = await svc.placeBid({ auctionId: a.id, userId: bot.id, amount: next });
    if (r.accepted) {
      spent++;
      const left = ROUNDS - spent;
      log(
        `${bot.alias} bids ${next.toFixed(2)} ${a.currency}` +
          (left > 0 ? `   (${left} more answer${left === 1 ? "" : "s"} left)` : "")
      );
    } else {
      // someone beat us to it between reading and writing — perfectly normal
      log(`${bot.alias} was too slow: ${r.reason}`);
    }
  }

  const end = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
  const need = minNextBid(D(end.currentPrice), D(end.bidIncrementPercent), end.bidSequence > 0);
  console.log("");
  log(`the opponents have stopped. Bid ${need.toFixed(2)} ${end.currency} and the lot is yours.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
