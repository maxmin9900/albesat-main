import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import LoginForm from "@/components/landing/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const { next = "/", registered } = await searchParams;
  return (
    <main className="min-h-screen bg-void">
      <LandingNav />
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-28">
        <p className="text-center text-xs tracking-[0.4em] text-gold/60 ornament">
          MEMBERS
        </p>
        <h1 className="mt-3 text-center font-display text-4xl text-silk">
          Sign in to ALBESAT
        </h1>
        <p className="mt-3 text-center text-sm text-cream/60">
          Bid in royal auctions and acquire masterpieces.
        </p>
        <LoginForm next={next} justRegistered={registered === "1"} />
      </div>
      <SiteFooter />
    </main>
  );
}
