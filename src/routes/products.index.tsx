import { createFileRoute, Link } from "@tanstack/react-router";
import { comparisonRows, faqs, products } from "@/data/products";
import { Check, Minus } from "lucide-react";
import { ProductCard } from "@/components/nazzim/ProductCard";
import { Faq, SectionHead, btnClass } from "@/components/nazzim/ui";
import { SocialProofLine, PaymentRow, TrustStrip } from "@/components/nazzim/conversion";
import { useT } from "@/lib/i18n";

const title = "منتجات Nazzim | أنظمة إنتاجية رقمية";
const description = "أنظمة رقمية بسيطة تساعدك على تنظيم ما يهمك: العادات، المهام، والأهداف.";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/products" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const t = useT();
  // Bundle first: the highest-value option anchors the comparison.
  const ordered = [...products].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <div className="container-nz py-14 sm:py-20">
      <div className="text-center">
        <SectionHead
          as="h1"
          align="center"
          eyebrow={t("المتجر")}
          title={t("اختر نظامك وابدأ اليوم")}
          description={t("ثلاثة أنظمة رقمية جاهزة. دفعة واحدة، وصول فوري، بلا اشتراك شهري.")}
        />
        <SocialProofLine className="mt-5" />
      </div>

      <TrustStrip className="mt-10" />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {ordered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <PaymentRow className="mt-6" />

      {/* Comparison — removes the "which one do I need?" hesitation */}
      <section className="mt-16">
        <SectionHead title={t("أي نظام يناسبك؟")} description={t("قارن بنظرة واحدة واختر بثقة.")} />
        <div className="no-scrollbar mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-[13.5px]">
            <caption className="sr-only">{t("مقارنة أنظمة نظّم")}</caption>
            <thead>
              <tr className="border-b border-border bg-surface/60 text-right">
                <th scope="col" className="px-5 py-3.5 font-semibold">
                  {t("المقارنة")}
                </th>
                {products.map((p) => (
                  <th key={p.id} scope="col" className="px-4 py-3.5 text-center font-semibold">
                    {t(p.arabicName)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <th scope="row" className="px-5 py-3 text-right font-normal text-muted-foreground">
                    {t(row.label)}
                  </th>
                  {products.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center">
                      {row.values[p.id] ? (
                        <Check className="mx-auto size-4 text-primary" strokeWidth={3} aria-hidden />
                      ) : (
                        <Minus className="mx-auto size-4 text-border-strong" aria-hidden />
                      )}
                      <span className="sr-only">{row.values[p.id] ? t("متوفر") : t("غير متوفر")}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Objection handling right where the decision happens */}
      <section className="mt-16">
        <SectionHead title={t("قبل أن تشتري")} description={t("أكثر الأسئلة التي تسبق الشراء.")} />
        <div className="mt-6 max-w-3xl">
          <Faq items={faqs.slice(0, 5)} />
        </div>
        <Link to="/faq" className={btnClass("outline", "sm", "mt-6")}>
          {t("كل الأسئلة")}
        </Link>
      </section>
    </div>
  );
}
