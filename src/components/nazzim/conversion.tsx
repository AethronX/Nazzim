import { Check, Lock, RefreshCcw, Zap } from "lucide-react";
import { formatPrice, products, savingsPercent } from "@/data/products";
import { paymentMethods } from "@/data/reviews";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { Button } from "./ui";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Reassurance row: the three objections that block a digital purchase. */
export function TrustStrip({ className }: { className?: string }) {
  const t = useT();
  const items = [
    { icon: Zap, title: "وصول فوري", body: "الرابط يظهر لك بعد الدفع مباشرة." },
    { icon: Lock, title: "دفع آمن", body: "بيانات الدفع لا تُخزَّن عندنا." },
    { icon: RefreshCcw, title: "دعم ما بعد الشراء", body: "لم يعمل الملف؟ نحلّها أو نعيد المبلغ." },
  ];
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {items.map((i) => (
        <li key={i.title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10">
            <i.icon className="size-4 text-primary" strokeWidth={2.4} aria-hidden />
          </span>
          <span>
            <span className="block text-[14px] font-bold">{t(i.title)}</span>
            <span className="block text-[12.5px] leading-[1.7] text-muted-foreground">{t(i.body)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Honest reassurance line, used near every primary CTA. */
export function SocialProofLine({ className }: { className?: string }) {
  const t = useT();
  return (
    <p className={cn("flex flex-wrap items-center justify-center gap-2 text-[13px] text-muted-foreground", className)}>
      <Check className="size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden />
      {t("منتج جديد من نظّم — جرّبه بضمان استرجاع كامل")}
    </p>
  );
}

export function PaymentRow({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {paymentMethods.map((m) => (
        <li
          key={m}
          className="latin rounded-md border border-border bg-card px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-muted-foreground"
        >
          {m}
        </li>
      ))}
    </ul>
  );
}

/** Checkout progress — reduces abandonment by showing how short the path is. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = useT();
  const steps = ["السلة", "بياناتك", "استلام الملف"];
  return (
    <ol className="flex items-center gap-2 text-[12.5px]">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-[11px] font-bold",
                done && "bg-primary/15 text-primary",
                active && "brand-gradient text-primary-foreground",
                !done && !active && "border border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : n}
            </span>
            <span className={cn(active ? "font-bold" : "text-muted-foreground")}>{t(s)}</span>
            {n < steps.length ? <span className="mx-1 h-px w-6 bg-border" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Order bump: offers the bundle upgrade, or the missing single system.
 * Renders nothing when there is nothing honest to offer.
 */
export function OrderBump() {
  const t = useT();
  const { items, add, remove } = useCart();
  const ids = items.map((i) => i.product.id);
  const bundle = products.find((p) => p.category === "bundle");
  const singles = products.filter((p) => p.category !== "bundle");

  if (!items.length) return null;

  // Case 1: has a single system, not the bundle → upgrade offer.
  if (bundle && !ids.includes(bundle.id) && ids.some((id) => singles.some((s) => s.id === id))) {
    const owned = singles.filter((s) => ids.includes(s.id));
    const extra = bundle.price - owned.reduce((sum, s) => sum + s.price, 0);
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/6 p-5">
        <p className="text-[14.5px] font-bold">{t("ترقية إلى النظام الكامل")}</p>
        <p className="mt-1.5 text-[13px] leading-[1.8] text-muted-foreground">
          {t("احصل على المهام والعادات والأهداف في نظام واحد بفارق")}{" "}
          <span className="latin font-bold text-foreground tabular-nums">
            {formatPrice(Math.max(0, extra))}
          </span>{" "}
          {t("فقط — بخصم")} {savingsPercent(bundle)}٪ {t("عن السعر الأصلي.")}
        </p>
        <Button
          variant="accent"
          size="sm"
          className="mt-4"
          onClick={() => {
            owned.forEach((s) => remove(s.id));
            add(bundle.id);
            track("add_to_cart", { id: bundle.id, source: "order_bump_upgrade" });
          }}
        >
          {t("ترقية الآن")}
        </Button>
      </div>
    );
  }

  // Case 2: has the bundle already → nothing to upsell.
  if (bundle && ids.includes(bundle.id)) return null;

  return null;
}
