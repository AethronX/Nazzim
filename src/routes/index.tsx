import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  Heart,
  Minus,
  Unlock,
} from "lucide-react";
import {
  comparisonRows,
  faqs,
  featuredProduct,
  formatPrice,
  products,
  savingsPercent,
  trustPoints,
} from "@/data/products";
import { benefits, features, hero, quotes, steps, worksheets } from "@/data/site";
import { Shot } from "@/components/nazzim/Shot";
import heroLaptop from "@/assets/shots/hero-laptop.png.asset.json";
import { BuyNowButton, ProductCard } from "@/components/nazzim/ProductCard";
import { ButtonLink, Faq, Section, SectionHead } from "@/components/nazzim/ui";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const title = "Nazzim | نظّم — أنظمة إنتاجية رقمية بالعربية";
const description =
  "أنظمة إنتاجية رقمية جاهزة لتنظيم المهام، بناء العادات، ومتابعة الأهداف. تعمل داخل Google Sheets، وصول فوري، وشراء لمرة واحدة.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const bundleHref = `/products/${featuredProduct.slug}`;

const icons = { chart: BarChart3, calendar: CalendarDays, unlock: Unlock, life: Heart } as const;

/* ---------------------------------- HERO ---------------------------------- */

function Hero() {
  const t = useT();
  return (
    <section className="relative overflow-hidden border-b border-border pt-14 pb-16 sm:pt-20 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-64 start-1/2 size-[900px] -translate-x-1/2 rounded-full bg-primary-soft/45 blur-3xl"
      />

      <div className="container-nz relative text-center">
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-soft/70 px-5 py-2.5 text-[12px] font-bold tracking-[0.14em] text-primary sm:text-[13px]">
          {t(hero.eyebrow)}
        </span>

        <h1 className="mx-auto mt-9 max-w-5xl text-[2.6rem] leading-[1.12] font-extrabold tracking-tight text-balance sm:mt-12 sm:text-[4.6rem] lg:text-[5.4rem]">
          {t(hero.headline)}
          <br />
          <span className="brand-text">{t(hero.headlineAccent)}</span>
        </h1>


        <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-[1.85] text-muted-foreground sm:mt-9 sm:text-[20px]">
          {t(hero.sub)}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:mt-11 sm:flex-row">
          <BuyNowButton
            product={featuredProduct}
            source="hero"
            size="lg"
            className="w-full sm:w-auto"
          />
          <ButtonLink to={bundleHref} variant="outline" size="lg" className="w-full sm:w-auto">
            {t(hero.secondaryCta)}
            <ArrowLeft className="size-4" aria-hidden />
          </ButtonLink>
        </div>


        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {trustPoints.map((tp) => (
            <li key={tp.title} className="flex items-center gap-2 text-[14px] font-semibold sm:text-[15px]">
              <Check className="size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden />
              {t(tp.title)}
            </li>
          ))}
        </ul>

        <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
          <img
            src={heroLaptop.url}
            alt={t("نظام نظّم داخل شاشة لابتوب: لوحة العادات والتقدم الشهري")}
            width={1067}
            height={571}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="relative w-full"
          />
        </div>

      </div>
    </section>
  );
}


/* -------------------------------- PRODUCTS -------------------------------- */

function Products() {
  const t = useT();
  return (
    <Section id="products">
      <SectionHead
        eyebrow={t("الأنظمة")}
        title={t("اختر نظامك")}
        description={t("ابدأ بأداة واحدة أو احصل على النظام الكامل.")}
        align="center"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------- FEATURES -------------------------------- */

function Features() {
  const t = useT();
  return (
    <Section tone="surface">
      <SectionHead
        eyebrow={t("لماذا نظّم")}
        title={t("نظام هادئ، نتائج واضحة")}
        description={t("كل عنصر في نظّم موجود لسبب واحد: أن تعرف ما عليك فعله اليوم، وأين وصلت.")}
        align="center"
      />
      <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const Icon = icons[f.icon];
          return (
            <li key={f.title}>
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              </span>
              <h3 className="mt-4 text-[16px] font-bold">{t(f.title)}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.85] text-muted-foreground">{t(f.body)}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ------------------------------- WORKSHEETS ------------------------------- */

function Worksheets() {
  const t = useT();
  return (
    <Section>
      <SectionHead
        eyebrow={t("ما الذي تحصل عليه")}
        title={t("أوراق عمل جاهزة للاستخدام")}
        description={t("لوحات مصممة لتنظيم يومك، متابعة عاداتك، إدارة مهامك، ومراقبة تقدمك.")}
        align="center"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {worksheets.map((w) => (
          <article key={w.name} className="rounded-3xl border border-border bg-card p-5">
            <Shot variant={w.visual} alt={`${t(w.arabicName)} — ${w.name}`} />
            <p className="latin mt-5 text-[12px] font-bold tracking-wide text-primary">{w.name}</p>
            <h3 className="mt-1 text-[17px] font-bold">{t(w.arabicName)}</h3>
            <p className="mt-2 text-[13.5px] leading-[1.85] text-muted-foreground">{t(w.body)}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------- COMPARISON ------------------------------- */

function Comparison() {
  const t = useT();
  return (
    <Section tone="surface" id="compare">
      <SectionHead
        eyebrow={t("المقارنة")}
        title={t("أي نظام يناسبك؟")}
        description={t("النظام الكامل يجمع الأدوات الثلاث بسعر أقل من شرائها منفصلة.")}
        align="center"
      />

      {/* Desktop / tablet table */}
      <div className="mt-10 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[14px]">
          <caption className="sr-only">{t("مقارنة بين أنظمة نظّم من حيث المزايا والسعر")}</caption>
          <thead>
            <tr>
              <th scope="col" className="p-4 text-start font-semibold text-muted-foreground">
                {t("الميزة")}
              </th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="p-4 text-center">
                  <span className="block text-[15px] font-bold">{t(p.arabicName)}</span>
                  <span className="latin mt-0.5 block text-[12px] font-medium text-muted-foreground">
                    {p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.label} className="odd:bg-card">
                <th scope="row" className="p-4 text-start font-medium">
                  {t(row.label)}
                </th>
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    {row.values[p.id] ? (
                      <>
                        <Check className="mx-auto size-4.5 text-primary" strokeWidth={3} aria-hidden />
                        <span className="sr-only">{t("متوفر")}</span>
                      </>
                    ) : (
                      <>
                        <Minus className="mx-auto size-4 text-muted-foreground/60" aria-hidden />
                        <span className="sr-only">{t("غير متوفر")}</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="p-4 text-start font-medium">
                {t("السعر")}
              </th>
              {products.map((p) => (
                <td key={p.id} className="p-4 text-center">
                  <span className="latin inline-flex items-baseline justify-center gap-2.5">
                    <span className="text-[16px] font-bold tabular-nums">{formatPrice(p.price)}</span>
                    {p.compareAtPrice ? (
                      <span className="text-[13px] text-muted-foreground line-through tabular-nums">
                        {formatPrice(p.compareAtPrice)}
                      </span>
                    ) : null}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-10 grid gap-4 md:hidden">
        {products.map((p) => (
          <article
            key={p.id}
            className={cn(
              "rounded-2xl border bg-card p-5",
              p.featured ? "border-primary/40" : "border-border",
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[16px] font-bold">{t(p.arabicName)}</h3>
              <span className="latin text-[15px] font-bold tabular-nums">{formatPrice(p.price)}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {comparisonRows.map((row) => (
                <li key={row.label} className="flex items-start gap-2 text-[13.5px]">
                  {row.values[p.id] ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden />
                  ) : (
                    <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                  )}
                  <span className={row.values[p.id] ? "" : "text-muted-foreground"}>{t(row.label)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------- QUOTES --------------------------------- */

function Quotes() {
  const t = useT();
  return (
    <Section>
      <SectionHead eyebrow={t("مبدأ نظّم")} title={t("التقدم يُبنى يوماً بيوم")} align="center" />
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {quotes.map((q) => (
          <li key={q.author} className="rounded-3xl border border-border bg-card p-6">
            <blockquote className="text-[15px] leading-[1.95] font-medium">{t(q.text)}</blockquote>
            <footer className="mt-5 border-t border-border pt-4 text-[13px]">
              <span className="font-bold">{t(q.author)}</span>
              <span className="text-muted-foreground"> — {t(q.role)}</span>
            </footer>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------- BENEFITS -------------------------------- */

function Benefits() {
  const t = useT();
  return (
    <Section tone="surface">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow={t("النتيجة")} title={t("ما يتغيّر بعد أسبوع من الاستخدام")} />
          <ul className="mt-8 space-y-6">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-3">
                <Check className="mt-1 size-4.5 shrink-0 text-primary" strokeWidth={3} aria-hidden />
                <div>
                  <h3 className="text-[15.5px] font-bold">{t(b.title)}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.85] text-muted-foreground">{t(b.body)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Shot
          variant="progress"
          className="shadow-soft"
          alt={t("لوحة التقدم في نظّم تعرض نسب الإنجاز الأسبوعية")}
        />
      </div>
    </Section>
  );
}

/* ---------------------------------- STEPS --------------------------------- */

function Steps() {
  const t = useT();
  return (
    <Section>
      <SectionHead
        eyebrow={t("كيف يعمل")}
        title={t("من الشراء إلى الاستخدام في دقائق")}
        align="center"
      />
      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.title} className="rounded-3xl border border-border bg-card p-6">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-[15px] font-bold text-ink-foreground">
              {s.n}
            </span>
            <h3 className="mt-4 text-[16px] font-bold">{t(s.title)}</h3>
            <p className="mt-2 text-[13.5px] leading-[1.85] text-muted-foreground">{t(s.body)}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 text-center">
        <ButtonLink to="/how-it-works" variant="outline" size="md">
          {t("تفاصيل أكثر عن طريقة العمل")}
        </ButtonLink>
      </div>
    </Section>
  );
}

/* ----------------------------------- FAQ ---------------------------------- */

function HomeFaq() {
  const t = useT();
  return (
    <Section tone="surface">
      <div className="mx-auto max-w-3xl">
        <SectionHead eyebrow={t("أسئلة قبل الشراء")} title={t("كل ما تحتاج معرفته")} align="center" />
        <div className="mt-10">
          <Faq items={faqs.slice(0, 6)} />
        </div>
        <div className="mt-8 text-center">
          <ButtonLink to="/faq" variant="ghost" size="sm">
            {t("كل الأسئلة الشائعة")}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}

/* --------------------------------- FINAL CTA ------------------------------ */

function FinalCta() {
  const t = useT();
  const pct = savingsPercent(featuredProduct);
  return (
    <section className="px-4 pb-16 sm:pb-24">
      <div className="container-nz">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-ink-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 start-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-[1.7rem] font-extrabold sm:text-4xl">{t("ابدأ بنظام واحد اليوم")}</h2>
            <p className="mx-auto mt-4 max-w-lg text-[14.5px] leading-[1.9] opacity-80">
              {t("النظام الكامل يجمع المهام والعادات والأهداف بخصم")} {pct}٪ — {t("وصول فوري بعد الدفع.")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink to={bundleHref} variant="accent" size="lg" className="w-full sm:w-auto">
                {t("احصل على النظام الكامل")} — {formatPrice(featuredProduct.price)}
              </ButtonLink>
              <ButtonLink to="/products" variant="outline" size="lg" className="w-full border-white/25 bg-transparent text-ink-foreground hover:bg-white/10 sm:w-auto">
                {t("استكشف الأنظمة")}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <Products />
      <Features />
      <Worksheets />
      <Comparison />
      <Benefits />
      <Quotes />
      <Steps />
      <HomeFaq />
      <FinalCta />
    </>
  );
}
