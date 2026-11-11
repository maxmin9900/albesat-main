import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import RegisterForm from "@/components/landing/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/" } = await searchParams;
  return (
    <main className="min-h-screen bg-void">
      <LandingNav />
      <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-28">
        <p className="text-center text-xs tracking-[0.4em] text-gold/60 ornament">
          MEMBERSHIP
        </p>
        <h1 className="mt-3 text-center font-display text-4xl text-silk">
          Create your account
        </h1>
        <p className="mt-3 text-center text-sm text-cream/60">
          For collectors across the Sultanate of Oman.
        </p>
        <RegisterForm next={next} />
      </div>
      <SiteFooter />
    </main>
  );
}
