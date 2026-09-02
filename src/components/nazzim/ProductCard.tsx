import { Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, savingsPercent, type Product } from "@/data/products";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { Button, btnClass } from "./ui";
import { ProductVisual } from "./ProductVisual";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { isPurchasable, usePaddleConfig } from "@/lib/payments";


/**
 * One-click express purchase: adds the product and jumps straight to checkout.
 * While Paddle is not configured (or the product has no Paddle price id) we do
 * NOT send the visitor into a dead payment path — we point them to /contact.
 */
export function BuyNowButton({
  product,
  label,
  className,
  variant = "accent",
  size = "md",
  source = "buy_now",
}: {
  product: Product;
  label?: string;
  className?: string;
  variant?: "primary" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  source?: string;
}) {
  const t = useT();
  const { add } = useCart();
  const navigate = useNavigate();
  const { config } = usePaddleConfig();
  const canBuy = isPurchasable(product, config);

  if (!canBuy) {
    return (
      <Link to="/contact" className={btnClass("outline", size, className)}>
        {t("الدفع قيد الإعداد — راسلنا")}
      </Link>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        try {
          add(product.id);
          track("begin_checkout", { id: product.id, price: product.price, source });
          navigate({ to: "/checkout" });
        } catch {
          toast.error(t("تعذّر بدء الطلب"), { description: t("حاول مرة أخرى بعد قليل.") });
        }
      }}
    >
      {label ?? `${t("اشترِ الآن")} — ${formatPrice(product.price)}`}
    </Button>
  );
}



export function AddToCartButton({
  product,
  label,
  className,
  variant = "primary",
  size = "md",
}: {
  product: Product;
  label?: string;
  className?: string;
  variant?: "primary" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const t = useT();
  const { add, lines } = useCart();
  const inCart = lines.some((l) => l.productId === product.id);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        try {
          add(product.id);
          track("add_to_cart", { id: product.id, price: product.price });
          toast.success(inCart ? t("المنتج موجود في سلتك") : t("تمت الإضافة إلى السلة"), {
            description: t(product.arabicName),
          });
        } catch {
          toast.error(t("تعذّر إضافة المنتج"), { description: t("حاول مرة أخرى بعد قليل.") });
        }
      }}
    >
      {label ?? (inCart ? t("في السلة") : t("أضف إلى السلة"))}
    </Button>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const t = useT();
  const savings = product.compareAtPrice ? product.compareAtPrice - product.price : 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        product.featured ? "border-primary/40 shadow-soft" : "border-border",
      )}
    >
      {product.badge ? (
        <span className="absolute top-4 start-4 z-10 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
          {t(product.badge)}
        </span>
      ) : null}

      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="block border-b border-border bg-surface/70 p-4"
        tabIndex={-1}
        aria-hidden
      >
        <div className="aspect-5/4 overflow-hidden rounded-2xl border border-border bg-card p-2">
          <ProductVisual
            variant={product.image}
            className="size-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      </Link>


      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-[17px] font-bold">
          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t(product.arabicName)}
          </Link>
        </h3>
        <p className="latin mt-0.5 text-[13px] font-medium text-muted-foreground">{product.name}</p>
        <p className="mt-3 text-[14px] leading-[1.85] text-muted-foreground">
          {t(product.description)}
        </p>

        <ul className="mt-4 flex-1 space-y-2">
          {product.features.slice(0, 3).map((f) => (
            <li key={f} className="flex gap-2 text-[13px] leading-[1.7] text-muted-foreground">
              <Check className="mt-1 size-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden />
              {t(f)}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-end gap-2.5">
          <span className="latin text-2xl font-bold tabular-nums">{formatPrice(product.price)}</span>
          {product.compareAtPrice ? (
            <>
              <span className="latin pb-1 text-[14px] text-muted-foreground line-through tabular-nums">
                {formatPrice(product.compareAtPrice)}
              </span>
              <span className="mb-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                {t("وفّر")} {formatPrice(savings)} · {savingsPercent(product)}٪
              </span>
            </>
          ) : null}
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">{t("دفعة واحدة · وصول فوري")}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <BuyNowButton
            product={product}
            source="product_card"
            className="flex-1"
          />

          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            className={btnClass("outline", "md", "sm:w-auto")}
          >
            {t("التفاصيل")}
          </Link>
        </div>
      </div>
    </article>
  );
}
