import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";

export const metadata = {
  title: "About Us — ALBESAT CARPET",
  description:
    "About Albesat Carpet (Al Besat Al Hariri LLC) — a specialist Persian carpet company in Muscat, Oman, offering fine handmade carpets and professional cleaning, restoration, repair, evaluation and insurance assessment services since 2003.",
};

// Approved About-Us copy — text is VERBATIM from the client's document.
// Do not paraphrase or rewrite the wording.
const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "About Albesat Carpet",
    body: [
      "Albesat Carpet is a specialist Persian carpet company based in Muscat, Oman, offering a carefully selected collection of fine handmade carpets, together with professional carpet cleaning, restoration, repair, evaluation, and insurance assessment services.",
      "Officially registered as Al Besat Al Hariri LLC, the company is widely known by customers as Albesat Carpet. Since its establishment in Oman in 2003, Albesat has built its reputation on trust, expertise, quality carpets, and professional customer service.",
    ],
  },
  {
    heading: "Our Story",
    body: [
      "The story of Albesat Carpet is built on decades of hands-on experience with Persian and handmade carpets.",
      "Our founder, Amir Hossein Dehshid, has been involved with carpets since the late 1980s. Over the years, his experience has covered many aspects of the carpet world, including carpet selection, sourcing, identification, retail, cleaning, restoration, repair, valuation, auctions, and customer consultation.",
      "This long practical background allows Albesat Carpet to offer customers not only beautiful carpets, but also reliable advice based on deep understanding of materials, origins, weaving quality, dyes, condition, and long-term value.",
    ],
  },
  {
    heading: "Our Carpet Collection",
    body: [
      "At Albesat Carpet, we offer a carefully selected range of handmade carpets, with a special focus on Persian carpets. Each carpet is chosen with attention to quality, design, material, craftsmanship, and character.",
      "Our collection may include traditional, classic, decorative, and collectible carpets suitable for homes, majlis rooms, offices, hospitality spaces, and private collections.",
      "We believe that choosing a carpet is not only about size, color, or design. It is also about understanding the carpet's origin, weaving structure, material, durability, artistic value, and how it will live within a space.",
      "That is why we aim to guide our customers honestly, helping them choose carpets that match their taste, interior, budget, and purpose.",
      "Albesat Carpet also organizes selected carpet auctions from time to time, giving customers the opportunity to discover and acquire fine carpets through a transparent and engaging buying experience.",
    ],
  },
  {
    heading: "Founder's Experience",
    body: [
      "Albesat Carpet was founded by Amir Hossein Dehshid, whose experience with Persian carpets goes back to the late 1980s. His knowledge has developed through years of direct involvement with handmade carpets, from selection and trading to cleaning, restoration, evaluation, auctions, and preservation.",
      "This personal expertise remains at the heart of Albesat Carpet today. Every carpet we sell and every service we provide is guided by the belief that a carpet should not be treated as an ordinary household item, but as a valuable piece with its own history, craftsmanship, and identity.",
    ],
  },
  {
    heading: "Our Team",
    body: [
      "Behind Albesat Carpet is a skilled team with practical experience in carpet handling, cleaning, restoration, repair, finishing, and customer service. Our workshop team works under experienced supervision, following careful methods suitable for different carpet types, including handmade, wool, silk, and machine-made carpets.",
      "From inspection and cleaning to delicate restoration and final quality control, each stage is handled with attention to detail and respect for the carpet's material, structure, and value.",
      "This helps customers receive not only expert advice, but also professional execution through a team that understands the importance of proper carpet care.",
    ],
  },
  {
    heading: "Our Professional Services",
    body: [
      "Alongside carpet sales, Albesat Carpet provides a complete range of professional carpet services, including professional carpet cleaning, edges and fringes renewal, moth damage repair, stain and color bleeding removal, carpet color re-dyeing, odor elimination, water damage repair, carpet straightening, reweaving damaged and rotten areas, installing leather trims, installing loops for hanging rugs, evaluation service, and insurance assessments.",
      "These services are suitable for private homes, collectors, institutions, interior designers, insurance-related cases, and anyone who values proper carpet care.",
    ],
  },
  {
    heading: "Our Approach",
    body: [
      "Every carpet is different. Whether we are advising a customer before purchase, cleaning a family carpet, restoring a damaged handmade rug, or preparing an insurance assessment, we first consider the carpet's material, dye condition, foundation, age, origin, weaving structure, and overall condition.",
      "Our approach combines traditional carpet knowledge with careful professional methods. We believe in honest advice, careful handling, and suitable solutions for each carpet.",
      "Our aim is always to help customers enjoy, protect, and preserve the beauty, value, and character of their carpets.",
    ],
  },
  {
    heading: "Our Commitment",
    body: [
      "At Albesat Carpet, we are committed to offering quality handmade and Persian carpets, providing honest and knowledgeable advice, carefully handling every carpet entrusted to us, respecting handmade craftsmanship, using suitable methods for each carpet type, preserving carpet beauty, structure, and long-term value, and delivering professional service before and after purchase.",
      "For us, carpets are not only decorative pieces. They are part of culture, heritage, memory, craftsmanship, and personal taste. Our role is to help customers choose, enjoy, maintain, and preserve them for many years.",
    ],
  },
  {
    heading: "Albesat Carpet Today",
    body: [
      "Today, Albesat Carpet continues to serve customers across Muscat and Oman with selected handmade carpets and specialist carpet services, combining long experience, practical knowledge, and personal attention.",
      "Whether you are looking for a fine Persian carpet, professional cleaning, delicate restoration, damage repair, a carpet auction, or a trusted evaluation, Albesat Carpet is ready to assist with care, experience, and professionalism.",
    ],
  },
];

const CITIES = ["Tabriz", "Qom", "Kashan", "Shiraz", "Mashhad", "Sistan"];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-void">
      <LandingNav />

      {/* hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-36 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(201,162,75,0.1),transparent_70%)]" />
        <p className="text-sm tracking-[0.4em] text-gold/60 ornament">
          ABOUT US
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-[1.08] text-silk sm:text-6xl">
          Guardians of the
          <span className="text-gradient-gold-animated"> Persian Loom</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-cream/70">
          A specialist Persian carpet house in Muscat, Oman — fine handmade
          carpets and professional carpet care, trusted since 2003.
        </p>
      </section>

      {/* story sections */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="gold-rule" />
        <div className="divide-y divide-gold/10 py-4">
          {SECTIONS.map((s) => (
            <article key={s.heading} className="py-12">
              <h2 className="font-display text-3xl text-gradient-gold sm:text-4xl">
                {s.heading}
              </h2>
              <div className="mt-6 space-y-5">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-justify leading-relaxed text-cream/80 sm:text-lg"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="gold-rule" />
      </section>

      {/* the six cities */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-xs tracking-[0.4em] text-gold/60 ornament">
          THE SIX CARPET CITIES
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {CITIES.map((c) => (
            <Link
              key={c}
              href={`/collection?city=${c.toLowerCase()}`}
              className="rounded-full border border-gold/30 px-5 py-2 text-sm tracking-[0.15em] text-cream/80 transition-all hover:border-gold hover:text-gold-light"
            >
              {c.toUpperCase()}
            </Link>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/collection"
            className="inline-block rounded-full border border-gold px-8 py-3 text-gold transition-colors hover:bg-gold hover:text-void"
          >
            Explore the Collection
          </Link>
          <Link
            href="/services"
            className="inline-block rounded-full border border-gold/40 px-8 py-3 text-cream/80 transition-colors hover:border-gold hover:text-gold-light"
          >
            Our Services
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
