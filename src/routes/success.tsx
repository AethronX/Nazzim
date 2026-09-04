import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { formatPrice, products } from "@/data/products";
import { ButtonLink, btnClass } from "@/components/nazzim/ui";
import { CheckoutSteps } from "@/components/nazzim/conversion";
import { getOrderStatus } from "@/lib/payments.functions";
import { useT } from "@/lib/i18n";
import { z } from "zod";

const title = "تمت العملية بنجاح | Nazzim نظّم";
const description = "شكرًا لشرائك من Nazzim. تفاصيل الوصول إلى نظامك الرقمي هنا.";

export const Route = createFileRoute("/success")({
  // Paddle returns the buyer with ?_ptxn=<transaction id>
  validateSearch: z.object({ _ptxn: z.string().optional() }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SuccessPage,
});

const steps = [
  "افتح رابط الملف الخاص بك.",
  "اختر «إنشاء نسخة» (Make a copy) من قائمة ملف.",
  "املأ صفحة الإعداد وابدأ أول يوم اليوم.",
];

function SuccessPage() {
  const t = useT();
  const { _ptxn } = Route.useSearch();
  const fetchOrder = useServerFn(getOrderStatus);

  const { data, isPending } = useQuery({
    queryKey: ["order", _ptxn],
    queryFn: () => fetchOrder({ data: { transactionId: _ptxn as string } }),
    enabled: Boolean(_ptxn),
    // The webhook confirms the payment; poll briefly until it lands.
    refetchInterval: (q) => (q.state.data && "found" in q.state.data && q.state.data.found ? false : 4000),
  });

  const confirmed = Boolean(data && data.found);
  const pending = Boolean(_ptxn) && !confirmed;

  return (
    <div className="container-nz py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft sm:p-12">
          <span
            className={
              confirmed
                ? "mx-auto grid size-14 place-items-center rounded-full bg-success text-success-foreground"
                : "mx-auto grid size-14 place-items-center rounded-full brand-gradient text-primary-foreground"
            }
          >
            {pending ? (
              <Loader2 className="size-7 animate-spin" aria-hidden />
            ) : (
              <Check className="size-7" strokeWidth={3} aria-hidden />
            )}
          </span>

          <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
            {confirmed
              ? t("تم تأكيد طلبك")
              : pending
                ? t("نؤكّد دفعتك الآن…")
                : t("شكرًا لك")}
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {confirmed
              ? data && data.found && data.emailSent
                ? `${t("أرسلنا رابط ملفك إلى")} ${data.email}`
                : t("طلبك محفوظ ومؤكد. روابط ملفاتك ظاهرة أدناه، وسيصلك بريد التأكيد قريبًا.")
              : pending
                ? t("قد يستغرق التأكيد لحظات. اترك الصفحة مفتوحة — ستتحدث تلقائيًا.")
                : t("إذا أتممت الدفع ولم تظهر تفاصيل طلبك، راسلنا وسنتحقق فورًا.")}
          </p>

          <div className="mt-6 flex justify-center">
            <CheckoutSteps current={3} />
          </div>
        </div>

        {confirmed && data && data.found && data.items.length ? (
          <section className="mt-8 space-y-3">
            <h2 className="text-[16px] font-bold">{t("ملفاتك")}</h2>
            {data.items.map((item) => (
              <div
                key={item.productId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="text-[14.5px] font-semibold">{t(item.name)}</span>
                {item.sheetUrl ? (
                  <a
                    href={item.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={btnClass("accent", "sm")}
                  >
                    {t("فتح الملف")}
                    <ExternalLink className="ms-1.5 size-3.5" aria-hidden />
                  </a>
                ) : (
                  <span className="text-[13px] text-muted-foreground">
                    {t("سيصلك الرابط على بريدك خلال وقت قصير")}
                  </span>
                )}
              </div>
            ))}
          </section>
        ) : null}

        {isPending && _ptxn ? null : null}

        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <li
              key={s}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-[14px] leading-[1.8]"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-[12px] font-bold text-primary">
                {i + 1}
              </span>
              {t(s)}
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-3xl border border-border bg-surface/60 p-6">
          <h2 className="text-[16px] font-bold">{t("أكمل نظامك")}</h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {t("أنظمة أخرى تعمل مع ما اشتريته بنفس الطريقة.")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {products
              .filter((p) => p.category !== "bundle")
              .map((p) => (
                <Link
                  key={p.id}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-surface/70"
                >
                  <span className="text-[14.5px] font-semibold">{t(p.arabicName)}</span>
                  <span className="latin text-[14px] font-bold tabular-nums">
                    {formatPrice(p.price)}
                  </span>
                </Link>
              ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <ButtonLink to="/products" variant="accent" size="md">
              {t("تصفح المتجر")}
            </ButtonLink>
            <Link to="/contact" className={btnClass("outline", "md")}>
              {t("لم يصلك الملف؟ راسلنا")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
