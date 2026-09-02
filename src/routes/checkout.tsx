import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { formatPrice } from "@/data/products";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { CartEmpty } from "@/components/nazzim/CartDrawer";
import { Button, Field, SectionHead } from "@/components/nazzim/ui";
import { StoreSetupNotice } from "@/components/nazzim/StoreSetupNotice";
import {
  CheckoutSteps,
  PaymentRow,
  SocialProofLine,
  TrustStrip,
} from "@/components/nazzim/conversion";
import { cartCheckoutReady, paddleLineItems, usePaddleConfig } from "@/lib/payments";
import { useT } from "@/lib/i18n";

const title = "إتمام الطلب | Nazzim نظّم";
const description = "أكمل بياناتك واحصل على نظامك الرقمي فورًا.";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const t = useT();
  const { items, subtotal, discount, total } = useCart();
  const { config, loading } = usePaddleConfig();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = cartCheckoutReady(items, config);

  if (!items.length) {
    return (
      <div className="container-nz py-14 sm:py-20">
        <SectionHead as="h1" title={t("إتمام الطلب")} />
        <div className="mt-10 max-w-lg">
          <CartEmpty />
        </div>
      </div>
    );
  }

  /** Opens the Paddle overlay checkout. Paddle owns the payment methods UI. */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !config.clientToken) return;
    if (!email.trim()) {
      toast.error(t("الرجاء كتابة بريدك الإلكتروني"));
      return;
    }
    setBusy(true);
    try {
      const paddle: Paddle | undefined = await initializePaddle({
        token: config.clientToken,
        environment: config.environment,
      });
      if (!paddle) throw new Error("paddle-init-failed");

      track("begin_checkout", { total, items: items.length, source: "checkout_submit" });
      paddle.Checkout.open({
        items: paddleLineItems(items),
        customer: { email: email.trim() },
        customData: { email: email.trim() },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/success`,
        },
      });
    } catch {
      toast.error(t("تعذّر فتح بوابة الدفع"), { description: t("حاول مرة أخرى بعد قليل.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-nz py-14 sm:py-20">
      <SectionHead
        as="h1"
        title={t("خطوة واحدة ويصلك نظامك")}
        description={t("منتجات رقمية — لا شحن ولا انتظار. الرابط يظهر لك مباشرة بعد الدفع.")}
      />
      <div className="mt-6">
        <CheckoutSteps current={2} />
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-base font-semibold">
            {t("بريدك فقط — لا حساب ولا خطوات إضافية")}
          </h2>

          <Field
            label={t("البريد الإلكتروني")}
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={!ready}
          />

          {ready ? (
            <>
              <p className="flex items-start gap-2 rounded-xl bg-surface/80 p-3.5 text-[12px] leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                {t("يتم الدفع داخل نافذة Paddle الآمنة، وتختار طريقة الدفع هناك. بريدك يُستخدم لإرسال رابط الملف فقط.")}
              </p>
              <TrustStrip />
            </>
          ) : (
            <StoreSetupNotice />
          )}
        </div>

        <aside className="h-fit space-y-5 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold">{t("ملخص الطلب")}</h2>
          <ul className="space-y-2.5 text-[14px]">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-start justify-between gap-3">
                <span>
                  <span className="latin block font-medium">{product.name}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {t(product.arabicName)} × {quantity}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatPrice(product.price * quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-border pt-4 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("المجموع الفرعي")}</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("الخصم")}</dt>
                <dd className="tabular-nums text-primary">−{formatPrice(discount)}</dd>
              </div>
            ) : null}

            <div className="flex justify-between border-t border-border pt-2.5 text-base font-bold">
              <dt>{t("الإجمالي")}</dt>
              <dd className="tabular-nums">{formatPrice(total)}</dd>
            </div>
          </dl>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            disabled={!ready || busy || loading}
          >
            {busy
              ? t("جارٍ فتح بوابة الدفع…")
              : ready
                ? `${t("إتمام الدفع")} — ${formatPrice(total)}`
                : t("الدفع غير مفعّل حاليًا")}
          </Button>

          {ready ? (
            <>
              <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
                <Lock className="size-3.5 text-primary" aria-hidden />
                {t("دفع آمن · وصول فوري بعد الدفع")}
              </p>
              <PaymentRow />
              <SocialProofLine className="border-t border-border pt-4" />
            </>
          ) : (
            <StoreSetupNotice compact />
          )}
        </aside>
      </form>
    </div>
  );
}
