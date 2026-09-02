import { createFileRoute } from "@tanstack/react-router";
import { formatPrice } from "@/data/products";
import { useCart } from "@/lib/cart";
import { CartEmpty, CartLines, CartSummary } from "@/components/nazzim/CartDrawer";
import { ButtonLink, SectionHead } from "@/components/nazzim/ui";
import {
  CheckoutSteps,
  OrderBump,
  PaymentRow,
  SocialProofLine,
  TrustStrip,
} from "@/components/nazzim/conversion";
import { useT } from "@/lib/i18n";
import { StoreSetupNotice } from "@/components/nazzim/StoreSetupNotice";
import { cartCheckoutReady, usePaddleConfig } from "@/lib/payments";


const title = "سلة الشراء | Nazzim نظّم";
const description = "راجع الأنظمة التي اخترتها قبل إتمام الطلب.";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/cart" },
    ],
    links: [{ rel: "canonical", href: "/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const t = useT();
  const { items, total } = useCart();
  const { config } = usePaddleConfig();
  const ready = cartCheckoutReady(items, config);

  return (
    <div className="container-nz py-14 pb-28 sm:py-20 lg:pb-20">

      <SectionHead as="h1" title={t("سلة الشراء")} description={t("منتجات رقمية — بلا شحن ولا انتظار.")} />
      {items.length ? (
        <>
          <div className="mt-6">
            <CheckoutSteps current={1} />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <CartLines />
              <OrderBump />
              <TrustStrip />
            </div>
            <aside className="h-fit space-y-5 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24">
              <h2 className="text-base font-semibold">{t("ملخص الطلب")}</h2>
              <CartSummary />
              {ready ? (
                <>
                  <ButtonLink to="/checkout" variant="accent" size="lg" className="w-full">
                    {t("إتمام الطلب")} — {formatPrice(total)}
                  </ButtonLink>
                  <p className="text-center text-[12px] text-muted-foreground">
                    {t("دفع آمن · وصول فوري بعد الدفع")}
                  </p>
                  <PaymentRow />
                  <SocialProofLine className="border-t border-border pt-4" />
                </>
              ) : (
                <StoreSetupNotice />
              )}

              <ButtonLink to="/products" variant="ghost" size="sm" className="w-full">
                {t("متابعة التصفح")}
              </ButtonLink>
            </aside>
          </div>

          {/* Sticky mobile checkout CTA */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-muted-foreground">{t("الإجمالي")}</p>
                <p className="latin text-[16px] font-bold tabular-nums">{formatPrice(total)}</p>
              </div>
              {ready ? (
                <ButtonLink to="/checkout" variant="accent" size="md" className="shrink-0">
                  {t("إتمام الطلب")}
                </ButtonLink>
              ) : (
                <ButtonLink to="/contact" variant="outline" size="md" className="shrink-0">
                  {t("الدفع قيد الإعداد — راسلنا")}
                </ButtonLink>
              )}

            </div>
          </div>
        </>
      ) : (
        <div className="mt-10 max-w-lg">
          <CartEmpty />
        </div>
      )}
    </div>
  );
}
