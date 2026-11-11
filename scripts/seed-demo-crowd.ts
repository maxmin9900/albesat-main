/**
 * Fills the auction table for a demo. NOT for production.
 *
 *   # add 5 seated members to the newest live auction, 2 of them bidding
 *   docker compose -p carpetlocal -f docker-compose.local.yml exec \
 *     -e COUNT=5 -e BIDS=2 web npx tsx scripts/seed-demo-crowd.ts
 *
 *   # a specific auction
 *   ... -e AUCTION=<id> ...
 *
 * Members are created once and reused (demo1@test.local …), always funded
 * enough to cover the deposit and a few rounds of bidding. Every seat and bid
 * goes through the real service, so what the client sees is the real thing —
 * deposits are genuinely locked and the compound minimum genuinely applies.
 */
import "./_no-server-only.cjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { creditFunds } from "../src/lib/auction/wallet";
import { D, minNextBid } from "../src/lib/auction/money";
import * as svc from "../src/lib/auction/service";

const prisma = new PrismaClient();

const PASSWORD = "Test@12345";
const COUNT = Math.max(1, Math.min(12, Number(process.env.COUNT ?? 5)));
const BIDS = Math.max(0, Number(process.env.BIDS ?? 2));

// Omani names so the CRM reads like the real customer base
const NAMES = [
  "Fatma Al Kindi", "Yousuf Al Harthy", "Amal Al Siyabi", "Khalid Al Maamari",
  "Huda Al Riyami", "Saif Al Hinai", "Muna Al Wahaibi", "Talal Al Busaidi",
  "Rania Al Amri", "Faisal Al Shukaili", "Iman Al Ghafri", "Nasser Al Rawahi",
];

async function main() {
  const auction = process.env.AUCTION
    ? await prisma.auction.findUniqueOrThrow({ where: { id: process.env.AUCTION } })
    : await prisma.auction.findFirstOrThrow({
        where: { status: { in: ["LIVE", "REGISTRATION_OPEN"] } },
        orderBy: { createdAt: "desc" },
      });

  const deposit = D(auction.startingPrice).mul(D(auction.depositPercent)).div(100);
  // enough for the deposit plus several compound rounds, so nobody stalls mid-demo
  const funds = Number(D(auction.startingPrice).mul(6).add(deposit).toFixed(0));
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log(`Auction: ${auction.title} (${auction.status})`);
  console.log(`Deposit to seat: ${deposit.toFixed(2)} ${auction.currency}\n`);

  const seated: { email: string; alias: string; id: string }[] = [];
  for (let i = 0; i < COUNT; i++) {
    const email = `demo${i + 1}@test.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, kycStatus: "VERIFIED" },
      create: {
        fullName: NAMES[i % NAMES.length],
        email,
        // Omani mobiles are 8 digits after +968, starting 7 or 9
        mobile: `+968910000${(i + 1).toString().padStart(2, "0")}`,
        passwordHash,
        address: "Muscat, Oman",
        country: "Oman",
        kycStatus: "VERIFIED",
      },
    });

    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const have = Number(w?.available ?? 0);
    if (have < funds) {
      await prisma.$transaction((tx) =>
        creditFunds(tx, user.id, D(funds - have), { note: "demo crowd top-up" })
      );
    }

    try {
      const j = await svc.joinAuction(auction.id, user.id);
      seated.push({ email, alias: j.alias, id: user.id });
      console.log(`  seated  ${j.alias.padEnd(13)} ${user.fullName.padEnd(20)} ${email}`);
    } catch (e) {
      console.log(`  skipped ${email}: ${(e as Error).message}`);
    }
  }

  if (BIDS > 0 && auction.status === "LIVE" && seated.length > 0) {
    console.log("");
    for (let n = 0; n < BIDS; n++) {
      const a = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
      const who = seated[n % seated.length];
      const next = minNextBid(D(a.currentPrice), D(a.bidIncrementPercent), a.bidSequence > 0);
      const r = await svc.placeBid({ auctionId: auction.id, userId: who.id, amount: next });
      console.log(
        r.accepted
          ? `  bid     ${who.alias} → ${next.toFixed(2)} ${auction.currency}`
          : `  refused ${who.alias} → ${r.reason}`
      );
    }
  }

  const after = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
  const nextMin = minNextBid(D(after.currentPrice), D(after.bidIncrementPercent), after.bidSequence > 0);
  console.log(`\n  current  ${D(after.currentPrice).toFixed(2)} ${after.currency}`);
  console.log(`  next min ${nextMin.toFixed(2)} ${after.currency}`);
  console.log(`\n  ROOM http://localhost:3000/auctions/${auction.id}`);
  console.log(`  every demo member signs in with the password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
