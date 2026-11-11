import { notFound } from "next/navigation";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import AuctionRoom from "@/components/auction/AuctionRoom";
import { getUserSession } from "@/lib/user-auth";
import { buildRoomSnapshot } from "@/lib/auction/snapshot";
import { runLifecycle } from "@/lib/auction/service";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";

export const dynamic = "force-dynamic";

/** The live auction room — /auctions/[id] */
export default async function AuctionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  // the live rooms are a local-only feature for now (see lib/auction/flags)
  if (!LIVE_AUCTION_ROOMS) notFound();
  const { id } = await params;
  const session = await getUserSession();
  // make sure the room opens on the auction's true current state
  await runLifecycle(id).catch(() => {});
  const snapshot = await buildRoomSnapshot(id, session?.uid ?? null);
  if (!snapshot) notFound();

  return (
    <main className="min-h-screen bg-void">
      <LandingNav />
      <AuctionRoom initial={snapshot} viewerName={session?.name ?? null} />
      <SiteFooter />
    </main>
  );
}
