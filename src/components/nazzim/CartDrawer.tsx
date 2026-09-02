import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/data/products";
import { ButtonLink } from "./ui";
import { ProductVisual } from "./ProductVisual";
import { useT } from "@/lib/i18n";

export function CartSummary() {
  const t = useT();
  const { subtotal, discount, total } = useCart();
  return (
    <dl className="space-y-2 text-[14px]">
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{t("المجموع الفرعي")}</dt>
        <dd className="font-medium tabular-nums">{formatPrice(subtotal)}</dd>
      </div>
      {discount > 0 ? (
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("الخصم")}</dt>
          <dd className="font-medium tabular-nums text-primary">−{formatPrice(discount)}</dd>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-2.5 text-base">
        <dt className="font-semibold">{t("الإجمالي")}</dt>
        <dd className="font-bold tabular-nums">{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}

export function CartLines({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { items, remove } = useCart();
  return (
    <ul className="space-y-3">
      {items.map(({ product, quantity }) => (
        <li
          key={product.id}
          className="flex gap-3 rounded-2xl border border-border bg-card p-3"
        >
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface sm:w-28">
            <ProductVisual
              variant={product.image}
              className="pointer-events-none absolute top-0 right-0 w-[420px] origin-top-right scale-[0.26]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to="/products/$slug"
              params={{ slug: product.slug }}
              className="latin block text-[13px] font-semibold hover:text-primary"
            >
              {product.name}
            </Link>
            <p className="text-[12px] text-muted-foreground">{t(product.arabicName)}</p>
            {!compact ? (
              <p className="mt-1 text-[12px] text-muted-foreground">{t("منتج رقمي — ترخيص واحد")}</p>
            ) : null}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[14px] font-bold tabular-nums">
                {formatPrice(product.price * quantity)}
              </span>
              {product.compareAtPrice ? (
                <span className="text-[12px] text-muted-foreground line-through tabular-nums">
                  {formatPrice(product.compareAtPrice * quantity)}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => remove(product.id)}
            aria-label={`${t("حذف")} ${t(product.arabicName)}`}
            className="grid size-9 shrink-0 place-items-center self-start rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CartEmpty({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-card p-8 text-center">
      <p className="text-base font-semibold">{t("سلتك فارغة")}</p>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        {t("اختر النظام المناسب لك وابدأ التنظيم.")}
      </p>
      <ButtonLink to="/products" onClick={onNavigate} variant="accent" size="md" className="mt-5">
        {t("استكشف الأنظمة")}
      </ButtonLink>
    </div>
  );
}

export function CartDrawer() {
  const t = useT();
  const { isOpen, closeCart, items } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("السلة")}>
      <button
        type="button"
        aria-label={t("إغلاق")}
        onClick={closeCart}
        className="absolute inset-0 animate-fade bg-ink/25 backdrop-blur-[2px]"
      />
      <div className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col border-l border-border bg-background shadow-lift animate-rise">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{t("سلة الشراء")}</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label={t("إغلاق السلة")}
            className="grid size-9 place-items-center rounded-full hover:bg-surface"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {items.length ? <CartLines compact /> : <CartEmpty onNavigate={closeCart} />}
        </div>

        {items.length ? (
          <div className="space-y-4 border-t border-border bg-surface/60 px-5 py-5">
            <CartSummary />
            <div className="flex flex-col gap-2">
              <ButtonLink to="/checkout" onClick={closeCart} variant="accent" size="lg">
                {t("إتمام الطلب")}
              </ButtonLink>
              <ButtonLink to="/cart" onClick={closeCart} variant="ghost" size="sm">
                {t("عرض السلة")}
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
