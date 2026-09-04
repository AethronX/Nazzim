import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ShieldCheck, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  CURRENCY_CODE,
  faqs,
  formatPrice,
  getProduct,
  products,
  savingsPercent,
  trustPoints,
} from "@/data/products";
import { paymentMethods } from "@/data/reviews";
import { StoreSetupNotice } from "@/components/nazzim/StoreSetupNotice";
import { isPurchasable, usePaddleConfig } from "@/lib/payments";

import { steps } from "@/data/site";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { Shot } from "@/components/nazzim/Shot";
import { ProductVisual, visualTitles, type VisualKey } from "@/components/nazzim/ProductVisual";
import { Button, Faq, SectionHead, btnClass } from "@/components/nazzim/ui";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/products/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "المنتج غير متوفر | Nazzim" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const title = `${product.arabicName} — ${product.name} | Nazzim نظّم`;
    const path = `/products/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: product.description },
        { property: "og:title", content: title },
        { property: "og:description", content: product.description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: path },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${product.arabicName} | ${product.name}`,
            description: product.longDescription,
            brand: { "@type": "Brand", name: "Nazzim" },
            category: "Digital productivity template",
            offers: {
              "@type": "Offer",
              price: product.price.toFixed(2),
              priceCurrency: CURRENCY_CODE,
              availability: "https://schema.org/InStock",
              url: path,
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: "/" },
              { "@type": "ListItem", position: 2, name: "المنتجات", item: "/products" },
              { "@type": "ListItem", position: 3, name: product.arabicName, item: path },
            ],
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

/** Flash-sale countdown. Client-only render to avoid hydration mismatch. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => setLeft((v) => (v === null ? null : Math.max(0, v - 1))), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  if (left === null) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

function ProductPage() {
  const t = useT();
  const { product } = Route.useLoaderData();
  const { add, openCart } = useCart();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState(product.id);
  const [bonus, setBonus] = useState(true);
  const [shotIndex, setShotIndex] = useState(0);
  const countdown = useCountdown(2 * 60 * 60 + 45 * 60);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? product,
    [selectedId, product],
  );

  const { config } = usePaddleConfig();
  const canBuy = isPurchasable(selected, config);


  const gallery = product.gallery as VisualKey[];
  const activeShot = gallery[Math.min(shotIndex, gallery.length - 1)] as VisualKey;

  useEffect(() => {
    setSelectedId(product.id);
    setShotIndex(0);
    track("view_product", { id: product.id, price: product.price });
  }, [product.id, product.price]);

  const addToCart = () => {
    add(selected.id);
    track("add_to_cart", { id: selected.id, price: selected.price, bonus });
    toast.success(`${t("أُضيف")} ${t(selected.arabicName)} ${t("إلى السلة")}`);
    openCart();
  };

  const buyNow = () => {
    add(selected.id);
    track("begin_checkout", { id: selected.id, source: "product_page" });
    navigate({ to: "/checkout" });
  };

  const chips = [
    { icon: Zap, label: t("وصول رقمي فوري") },
    { icon: Check, label: t("تابع عاداتك بوضوح") },
    { icon: ShieldCheck, label: t("شراء مرة واحدة") },
  ];

  return (
    <div className="pb-28 lg:pb-20">
      <div className="container-nz pt-6">
        <nav aria-label={t("مسار التنقل")} className="text-[13px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t("الرئيسية")}
          </Link>
          <span className="px-2" aria-hidden>
            /
          </span>
          <Link to="/products" className="hover:text-foreground">
            {t("المنتجات")}
          </Link>
          <span className="px-2" aria-hidden>
            /
          </span>
          <span className="text-foreground">{t(product.arabicName)}</span>
        </nav>
      </div>

      <div className="container-nz mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* ── Gallery ─────────────────────────────── */}
        <div>
          <div className="overflow-hidden rounded-3xl border border-border bg-surface/60 p-3 sm:p-5">
            <Shot
              key={activeShot}
              variant={activeShot}
              eager={shotIndex === 0}
              className="shadow-soft"
              alt={`${t(product.arabicName)} — ${visualTitles[activeShot] ?? activeShot}`}
            />
          </div>

          <div className="relative mt-4 flex items-center gap-2">
            <button
              type="button"
              aria-label={t("السابق")}
              onClick={() => setShotIndex((i) => (i - 1 + gallery.length) % gallery.length)}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <ul className="no-scrollbar flex flex-1 gap-3 overflow-x-auto">
              {gallery.map((g, i) => (
                <li key={g}>
                  <button
                    type="button"
                    onClick={() => setShotIndex(i)}
                    aria-current={i === shotIndex}
                    className={cn(
                      "block w-24 shrink-0 overflow-hidden rounded-xl border bg-card p-1 transition-all sm:w-28",
                      i === shotIndex
                        ? "border-primary ring-2 ring-primary/25"
                        : "border-border hover:border-border-strong",
                    )}
                  >
                    <span className="relative block h-16 w-full overflow-hidden rounded-lg bg-surface sm:h-20">
                      <ProductVisual
                        variant={g}
                        className="pointer-events-none absolute top-0 right-0 w-[420px] origin-top-right scale-[0.24]"
                      />
                    </span>
                    <span className="sr-only">{visualTitles[g] ?? g}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              aria-label={t("التالي")}
              onClick={() => setShotIndex((i) => (i + 1) % gallery.length)}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* ── Buy box ─────────────────────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h1 className="text-[30px] font-extrabold leading-[1.2] tracking-tight sm:text-[38px]">
            {t(product.arabicName)}
          </h1>

          <ul className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-[12.5px] font-medium text-foreground"
              >
                <c.icon className="size-3.5 text-primary" strokeWidth={2.4} aria-hidden />
                {c.label}
              </li>
            ))}
          </ul>

          {/* Flash-sale bar */}
          <div className="mt-5 rounded-lg bg-ink px-4 py-3 text-center text-[12.5px] font-bold tracking-[0.06em] text-ink-foreground">
            {t("عرض محدود — ينتهي خلال")}{" "}
            <span className="latin tabular-nums">{countdown ?? "--:--:--"}</span> ⏳
          </div>

          {/* Variants */}
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">{t("اختر النظام")}</legend>
            {products.map((p) => {
              const isActive = p.id === selectedId;
              const off = savingsPercent(p);
              return (
                <label
                  key={p.id}
                  className={cn(
                    "relative flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-card px-4 py-4 transition-all",
                    isActive
                      ? "border-foreground shadow-soft"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={p.id}
                    checked={isActive}
                    onChange={() => setSelectedId(p.id)}
                    className="size-5 shrink-0 accent-foreground"
                  />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15.5px] font-bold">{t(p.arabicName)}</span>
                    {off > 0 ? (
                      <span className="latin rounded-md bg-warning px-1.5 py-0.5 text-[10.5px] font-bold text-warning-foreground">
                        {off}% OFF
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="latin block text-[17px] font-bold tabular-nums">
                      {formatPrice(p.price)}
                    </span>
                    {p.compareAtPrice ? (
                      <span className="latin block text-[12.5px] text-muted-foreground line-through tabular-nums">
                        {formatPrice(p.compareAtPrice)}
                      </span>
                    ) : null}
                  </span>
                  {p.featured ? (
                    <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-[10.5px] font-bold text-primary-foreground shadow-lift">
                      {t("الأكثر طلباً")}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </fieldset>

          {/* Order bump */}
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-border bg-card px-4 py-3.5">
            <input
              type="checkbox"
              checked={bonus}
              onChange={(e) => setBonus(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-foreground"
            />
            <span>
              <span className="block text-[14.5px] font-bold">{t("قوالب إضافية مجاناً")}</span>
              <span className="block text-[12.5px] leading-[1.7] text-muted-foreground">
                {t("استلم قوالب نظّم الجديدة على بريدك عند إصدارها — بدون أي رسوم إضافية، ويمكنك الإلغاء متى شئت.")}
              </span>
            </span>
          </label>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={addToCart}
            className="mt-4 w-full rounded-lg bg-ink px-6 py-4 text-[15px] font-bold tracking-[0.08em] text-ink-foreground transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            {t("أضف إلى السلة")}
          </button>

          {canBuy ? (
            <button
              type="button"
              onClick={buyNow}
              className="mt-2 w-full rounded-lg border-2 border-border-strong px-6 py-3.5 text-[14.5px] font-bold transition-colors hover:bg-surface"
            >
              {t("اشترِ الآن")} — {formatPrice(selected.price)}
            </button>
          ) : (
            <StoreSetupNotice className="mt-3" />
          )}

          {/* Payment methods */}
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {paymentMethods.map((m) => (
              <li
                key={m}
                className="latin rounded-[5px] border border-border bg-card px-2 py-1 text-[10px] font-bold tracking-wide text-muted-foreground"
              >
                {m}
              </li>
            ))}
          </ul>

          {/* Honest launch note — no fabricated review counts or testimonials */}
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[13.5px] font-medium text-muted-foreground">
            <Check className="size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden />
            {t("منتج جديد من نظّم — جرّبه بضمان استرجاع كامل")}
          </p>

          <ul className="mt-5 space-y-2.5 text-[13.5px]">
            {trustPoints.map((tp) => (
              <li key={tp.title} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.8} aria-hidden />
                <span>
                  <span className="font-semibold">{t(tp.title)}</span>
                  <span className="text-muted-foreground"> — {t(tp.body)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Details */}
      <div className="container-nz mt-16 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">{t("ماذا يفعل لك")}</h2>
          <ul className="mt-4 space-y-2.5 text-[14px] leading-[1.85] text-muted-foreground">
            {product.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.4} aria-hidden />
                {t(f)}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">{t("ما تحصل عليه")}</h2>
          <ul className="mt-4 space-y-2.5 text-[14px] leading-[1.85] text-muted-foreground">
            {product.whatYouGet.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.4} aria-hidden />
                {t(f)}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">{t("المتطلبات")}</h2>
          <ul className="mt-4 space-y-2.5 text-[14px] leading-[1.85] text-muted-foreground">
            {product.requirements.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.4} aria-hidden />
                {t(f)}
              </li>
            ))}
          </ul>
          <h3 className="mt-6 flex items-center gap-2 text-[15px] font-semibold">
            <Users className="size-4 text-primary" aria-hidden />
            {t("لمن هذا النظام")}
          </h3>
          <ul className="mt-3 space-y-2 text-[14px] leading-[1.85] text-muted-foreground">
            {product.audience.map((a) => (
              <li key={a}>— {t(a)}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* How it works */}
      <div className="container-nz mt-16">
        <SectionHead title={t("كيف تبدأ")} description={t("من الدفع إلى الاستخدام في دقائق.")} />
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid size-9 place-items-center rounded-full bg-ink text-[14px] font-bold text-ink-foreground">
                {s.n}
              </span>
              <h3 className="mt-3 text-[15.5px] font-semibold">{t(s.title)}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.85] text-muted-foreground">{t(s.body)}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* FAQ */}
      <div className="container-nz mt-16">
        <SectionHead title={t("أسئلة شائعة عن هذا المنتج")} />
        <div className="mt-6 max-w-3xl">
          <Faq items={faqs.slice(0, 5).map((it) => ({ q: t(it.q), a: t(it.a) }))} />
        </div>
      </div>

      {/* Related */}
      <div className="container-nz mt-16">
        <SectionHead title={t("أنظمة أخرى")} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {products
            .filter((p) => p.id !== product.id)
            .map((p) => (
              <Link
                key={p.id}
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-surface/70"
              >
                <span>
                  <span className="latin block text-[15px] font-semibold">{p.name}</span>
                  <span className="text-[13px] text-muted-foreground">{t(p.arabicName)}</span>
                </span>
                <span className="latin text-[15px] font-bold tabular-nums">
                  {formatPrice(p.price)}
                </span>
              </Link>
            ))}
        </div>
        <Link to="/products" className={btnClass("outline", "sm", "mt-6")}>
          {t("كل المنتجات")}
        </Link>
      </div>

      {/* Sticky mobile purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{t(selected.arabicName)}</p>
            <p className="latin text-[15px] font-bold tabular-nums">{formatPrice(selected.price)}</p>
          </div>
          {canBuy ? (
            <Button variant="accent" size="md" onClick={buyNow} className="shrink-0">
              {t("اشترِ الآن")}
            </Button>
          ) : (
            <Button variant="accent" size="md" onClick={addToCart} className="shrink-0">
              {t("أضف إلى السلة")}
            </Button>
          )}


        </div>
      </div>
    </div>
  );
}
