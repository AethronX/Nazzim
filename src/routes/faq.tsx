import { createFileRoute } from "@tanstack/react-router";
import { faqs } from "@/data/products";
import { ButtonLink, Faq, SectionHead } from "@/components/nazzim/ui";
import { useT } from "@/lib/i18n";

const title = "الأسئلة الشائعة | Nazzim نظّم";
const description = "إجابات عن منتجات Nazzim، طريقة الوصول، الاستخدام على الهاتف، وسياسة الاسترجاع.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const t = useT();
  return (
    <div className="container-nz py-14 sm:py-20">
      <SectionHead
          as="h1"
        eyebrow={t("الدعم")}
        title={t("الأسئلة الشائعة")}
        description={t("كل ما تحتاج معرفته قبل استخدام أنظمة Nazzim.")}
      />
      <div className="mt-10 max-w-3xl">
        <Faq items={faqs} />
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/products" variant="accent" size="md">
          {t("استكشف الأنظمة")}
        </ButtonLink>
        <ButtonLink to="/contact" variant="outline" size="md">
          {t("تواصل معنا")}
        </ButtonLink>
      </div>
    </div>
  );
}
