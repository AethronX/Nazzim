import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { ProductVisual, visualTitles, type VisualKey } from "@/components/nazzim/ProductVisual";
import { ButtonLink, SectionHead, Section } from "@/components/nazzim/ui";
import { useT } from "@/lib/i18n";

const title = "كيف يعمل نظّم؟ | Nazzim";
const description =
  "ثلاث خطوات فقط: اختر النظام، أكمل الشراء، ثم افتحه في Google Sheets وابدأ التنظيم.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorks,
});

const steps = [
  {
    n: "01",
    title: "اختر",
    body: "اختر النظام المناسب لك: العادات، المهام والأهداف، أو النظام الكامل.",
  },
  { n: "02", title: "احصل", body: "أكمل عملية الشراء واحصل على المنتج الرقمي." },
  { n: "03", title: "نظّم", body: "افتح النظام في Google Sheets وابدأ استخدامه في نفس اليوم." },
];

const notes = [
  "الأنظمة جاهزة — لا تحتاج إلى إعداد معقّد.",
  "كل شيء داخل ملف واحد واضح البنية.",
  "شراء مرة واحدة بدون اشتراك شهري.",
  "بنية Nazzim تتوسع مستقبلًا لأدوات وأنظمة جديدة.",
];

function HowItWorks() {
  const t = useT();
  return (
    <>
      <div className="container-nz py-14 sm:py-20">
        <SectionHead
          as="h1"
          eyebrow={t("كيف يعمل")}
          title={t("ابدأ خلال دقائق")}
          description={t("Nazzim نظام إنتاجي جاهز يعمل داخل Google Sheets — التقنية بسيطة، والقيمة في التنظيم.")}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <span className="latin text-2xl font-bold text-border-strong">{s.n}</span>
              <h2 className="mt-2 text-lg font-semibold">{t(s.title)}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{t(s.body)}</p>
            </div>
          ))}
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <li
              key={n}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-[14px]"
            >
              <Check className="size-4 shrink-0 text-primary" strokeWidth={2.4} />
              {t(n)}
            </li>
          ))}
        </ul>
      </div>

      <Section tone="surface">
        <SectionHead title={t("شاشات النظام")} description={t("نظرة على ما ستستخدمه كل يوم.")} />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {(["dashboard", "habits", "tasks", "goals"] as VisualKey[]).map((k) => (
            <figure key={k}>
              <ProductVisual variant={k} />
              <figcaption className="mt-2.5 text-[13px] text-muted-foreground">
                {t(visualTitles[k])}
              </figcaption>
            </figure>
          ))}
        </div>
        <ButtonLink to="/products" variant="accent" size="lg" className="mt-10">
          {t("استكشف الأنظمة")}
        </ButtonLink>
      </Section>
    </>
  );
}
