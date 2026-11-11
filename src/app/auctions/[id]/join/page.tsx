import { redirect } from "next/navigation";

/**
 * The registration form used to live here, one page per carpet. It now sits
 * at the top of /auctions and registers you for a whole sale session, so
 * this route only survives to keep old links and bookmarks working.
 */
export default async function AuctionJoinRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/auctions?session=${id}#register`);
}
