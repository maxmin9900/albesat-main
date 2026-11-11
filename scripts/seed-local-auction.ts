/**
 * Local test fixture for the live auction. NOT for production.
 *
 *   docker compose -p carpetlocal -f docker-compose.local.yml exec web \
 *     npx tsx scripts/seed-local-auction.ts
 *
 * Creates four members you can actually sign in as, gives them funds, puts a
 * work with an intrinsic value in the catalogue, and opens a live auction on
 * it. Re-running is safe: it reuses the members and opens a fresh auction.
 *
 * Members (password for all: Test@12345)
 *   bidder1@test.local  +96890000001  10 000 OMR
 *   bidder2@test.local  +96890000002  10 000 OMR
 *   bidder3@test.local  +96890000003   3 000 OMR
 *   broke@test.local    +96890000004      50 OMR  (cannot afford the deposit)
 */
import "./_no-server-only.cjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { creditFunds } from "../src/lib/auction/wallet";
import { D } from "../src/lib/auction/money";
import * as svc from "../src/lib/auction/service";

const prisma = new PrismaClient();

const PASSWORD = "Test@12345";
const MEMBERS = [
  { email: "bidder1@test.local", mobile: "+96890000001", name: "Layla Al Habsi", funds: 10_000 },
  { email: "bidder2@test.local", mobile: "+96890000002", name: "Omar Al Balushi", funds: 10_000 },
  { email: "bidder3@test.local", mobile: "+96890000003", name: "Nadia Al Zadjali", funds: 3_000 },
  { email: "broke@test.local", mobile: "+96890000004", name: "Salim Al Rashdi", funds: 50 },
];

/** minutes the test auction runs for; override with MINUTES=3 */
const MINUTES = Number(process.env.MINUTES ?? 10);
/** intrinsic value of the test lot; deposit is half of this */
const VALUE = Number(process.env.VALUE ?? 1000);
/** the winner's payment window; keep it long for a demo so nothing auto-fails */
const PAYMENT_MIN = Number(process.env.PAYMENT_MIN ?? 60);

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log("— members —");
  for (const m of MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { passwordHash, kycStatus: "VERIFIED" },
      create: {
        fullName: m.name,
        email: m.email,
        mobile: m.mobile,
        passwordHash,
        address: "Muscat, Oman",
        country: "Oman",
        kycStatus: "VERIFIED",
      },
    });

    // top the wallet up to the target so re-runs are predictable
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const have = Number(w?.available ?? 0);
    if (have < m.funds) {
      await prisma.$transaction((tx) =>
        creditFunds(tx, user.id, D(m.funds - have), { note: "local test top-up" })
      );
    }
    const after = await prisma.wallet.findUnique({ where: { userId: user.id } });
    console.log(
      `  ${m.email.padEnd(20)} ${m.mobile}  available ${Number(after?.available ?? 0)} · locked ${Number(after?.locked ?? 0)}`
    );
  }

  console.log("\n— the lot —");
  const tag = Date.now().toString(36).toUpperCase();
  const art = await prisma.artwork.create({
    data: {
      code: `TEST-${tag}`,
      title: `Test Lot ${tag}`,
      city: "Tabriz",
      category: "Medallion",
      price: VALUE,
      currency: "OMR",
      status: "PUBLISHED",
      lengthCm: 300,
      widthCm: 200,
      dimensions: "300 × 200 cm · 9′10″ × 6′7″",
      pileMaterial: "Hand-spun kork wool",
      approxAge: "Contemporary",
      description: "A test lot created by scripts/seed-local-auction.ts.",
      intrinsicValue: VALUE,
      intrinsicValueSource: "manual",
      intrinsicValuedAt: new Date(),
      images: {
        create: [
          { url: "/carpets/tabriz-1.jpg", type: "MAIN", sortOrder: 0 },
          { url: "/carpets/tabriz-2.jpg", type: "GALLERY", sortOrder: 1 },
          { url: "/carpets/tabriz-3.jpg", type: "GALLERY", sortOrder: 2 },
        ],
      },
    },
  });
  console.log(`  ${art.title} · intrinsic value ${VALUE} OMR`);

  console.log("\n— auction —");
  const now = Date.now();
  const auction = await svc.createAuction({
    title: `Test Auction ${tag}`,
    lots: [{ artworkId: art.id }],
    currency: "OMR",
    startAt: new Date(now - 1000), // starts immediately
    endAt: new Date(now + MINUTES * 60_000),
    depositPercent: 50,
    bidIncrementPercent: 20,
    bidCoveragePercent: 100,
    antiSnipingWindowSec: 30,
    extensionSec: 30,
    paymentDeadlineMin: PAYMENT_MIN,
  });
  const fresh = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });

  console.log(`  status        ${fresh.status}`);
  console.log(`  starting      ${Number(fresh.startingPrice)} OMR  (= intrinsic value)`);
  console.log(`  deposit       ${(VALUE * 50) / 100} OMR  to join`);
  console.log(`  min bids      ${VALUE} → ${VALUE * 1.2} → ${VALUE * 1.44} → ${VALUE * 1.728} …`);
  console.log(`  ends in       ${MINUTES} min  (+30s per late bid)`);
  console.log(`  payment window ${PAYMENT_MIN} min after the hammer`);
  console.log(`\n  ROOM  http://localhost:3000/auctions/${auction.id}`);
  console.log(`  ADMIN http://localhost:3000/admin/auctions/${auction.id}`);
  console.log(`\n  sign in at http://localhost:3000/login — password for every member: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
