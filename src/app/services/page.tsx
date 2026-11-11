import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import ServicesShowcase from "@/components/landing/ServicesShowcase";
import PageBackdrop from "@/components/landing/PageBackdrop";

export const metadata = {
  title: "Services — ALBESAT CARPET",
  description:
    "Professional carpet cleaning, restoration, finishing and valuation services by Al Besat Al Hariri LLC — Muscat, Oman. Where heritage meets mastery.",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-void">
      <LandingNav />
      {/* the restorer at his bench — the page is about that work */}
      <PageBackdrop src="/backgrounds/services.jpg" strength={0.55} position="35% 40%">
        <ServicesShowcase />
      </PageBackdrop>
      <SiteFooter />
    </main>
  );
}
